import http from "http";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const companionJson = express.json({ limit: "25mb" });

  // Track active EventSource (SSE) clients
  let sseClients: any[] = [];

  const DEFAULT_PROGRAM_LAYERS: Record<number, string | null> = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
  };

  // Latest PGM bus state per project scope, so newly opened OBS/vMix links catch up.
  const programState: Record<string, Record<number, string | null>> = {};

  const normalizeScope = (projectScope: unknown) =>
    typeof projectScope === "string" && projectScope.trim() ? projectScope : "GLOBAL";

  const getProgramState = (projectScope: string) => {
    if (!programState[projectScope]) {
      programState[projectScope] = { ...DEFAULT_PROGRAM_LAYERS };
    }
    return programState[projectScope];
  };

  const applyProgramTrigger = (
    current: Record<number, string | null>,
    assetId: string,
    action = "toggle",
    layer?: number
  ) => {
    const next = { ...current };
    const activeLayer = layer && layer > 0 ? layer : 1;
    const isProgram = Object.values(next).includes(assetId);

    if (action === "play") {
      Object.keys(next).forEach((key) => {
        if (next[Number(key)] === assetId) next[Number(key)] = null;
      });
      next[activeLayer] = assetId;
      return next;
    }

    if (action === "stop") {
      Object.keys(next).forEach((key) => {
        if (next[Number(key)] === assetId) next[Number(key)] = null;
      });
      return next;
    }

    if (isProgram) {
      Object.keys(next).forEach((key) => {
        if (next[Number(key)] === assetId) next[Number(key)] = null;
      });
      return next;
    }

    Object.keys(next).forEach((key) => {
      if (next[Number(key)] === assetId) next[Number(key)] = null;
    });
    next[activeLayer] = assetId;
    return next;
  };

  const broadcastTrigger = (payload: object) => {
    const data = JSON.stringify(payload);
    sseClients.forEach((client) => {
      client.write(`event: trigger\ndata: ${data}\n\n`);
    });
  };

  const replayProgramState = (client: any) => {
    Object.entries(programState).forEach(([projectScope, layers]) => {
      Object.entries(layers).forEach(([layer, assetId]) => {
        if (!assetId) return;
        const payload = JSON.stringify({
          assetId,
          action: "play",
          layer: Number(layer),
          projectScope,
        });
        client.write(`event: trigger\ndata: ${payload}\n\n`);
      });
    });
  };

  // Latest animation config per project and asset. Keeping the scope in the
  // state key prevents one project's animation protocol from overwriting
  // another project's protocol before a reconnecting OBS/vMix output replays it.
  const animationState: Record<
    string,
    Record<string, { animation: unknown; presetOverrides?: unknown }>
  > = {};

  const broadcastAnimation = (payload: object) => {
    const data = JSON.stringify(payload);
    sseClients.forEach((client) => {
      client.write(`event: animation\ndata: ${data}\n\n`);
    });
  };

  const replayAnimationState = (client: any) => {
    Object.entries(animationState).forEach(([projectScope, assets]) => {
      Object.entries(assets).forEach(([assetId, state]) => {
        const payload = JSON.stringify({ assetId, ...state, projectScope });
        client.write(`event: animation\ndata: ${payload}\n\n`);
      });
    });
  };

  // Latest overlay data per asset (teams, players, layout, etc.)
  const dataState: Record<string, { data: Record<string, unknown>; projectScope?: string }> = {};

  const broadcastData = (payload: object) => {
    const line = JSON.stringify(payload);
    sseClients.forEach((client) => {
      client.write(`event: data\ndata: ${line}\n\n`);
    });
  };

  const replayDataState = (client: any) => {
    Object.entries(dataState).forEach(([assetId, entry]) => {
      const payload = JSON.stringify({
        assetId,
        data: entry.data,
        projectScope: entry.projectScope,
      });
      client.write(`event: data\ndata: ${payload}\n\n`);
    });
  };

  // API Route for SSE connection
  app.get("/api/companion/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    // Add to active clients list
    sseClients.push(res);
    replayProgramState(res);
    replayAnimationState(res);
    replayDataState(res);

    // Keep connection alive with silent ping every 30 seconds
    const pingInterval = setInterval(() => {
      res.write("event: ping\ndata: keep-alive\n\n");
    }, 30000);

    req.on("close", () => {
      clearInterval(pingInterval);
      sseClients = sseClients.filter((client) => client !== res);
    });
  });

  // API Route to register Companion action / trigger
  app.get("/api/companion/trigger", (req, res) => {
    const { assetId, action, layer, projectScope } = req.query;

    if (!assetId) {
      return res.status(400).json({ error: "Missing assetId" });
    }
    const scope = normalizeScope(projectScope);
    const parsedLayer = layer ? parseInt(layer as string, 10) : undefined;
    const resolvedAction = typeof action === "string" ? action : "toggle";

    programState[scope] = applyProgramTrigger(
      getProgramState(scope),
      String(assetId),
      resolvedAction,
      parsedLayer
    );

    const payload = {
      assetId,
      action: resolvedAction,
      layer: parsedLayer,
      projectScope: scope,
    };

    broadcastTrigger(payload);

    return res.json({
      success: true,
      message: `Trigger sent to ${sseClients.length} active broadcast overlays/dashboards.`,
      payload,
    });
  });

  // Supporting POST method too for modular controls
  app.post("/api/companion/trigger", companionJson, (req, res) => {
    const { assetId, action, layer, projectScope } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: "Missing assetId" });
    }
    const scope = normalizeScope(projectScope);
    const parsedLayer = layer ? parseInt(layer, 10) : undefined;
    const resolvedAction = action || "toggle";

    programState[scope] = applyProgramTrigger(
      getProgramState(scope),
      String(assetId),
      resolvedAction,
      parsedLayer
    );

    const payload = {
      assetId,
      action: resolvedAction,
      layer: parsedLayer,
      projectScope: scope,
    };

    broadcastTrigger(payload);

    return res.json({
      success: true,
      message: `Trigger sent to ${sseClients.length} active broadcast overlays/dashboards.`,
      payload,
    });
  });

  app.post("/api/companion/animation", companionJson, (req, res) => {
    const { assetId, animation, presetOverrides, projectScope } = req.body;

    if (!assetId || !animation) {
      return res.status(400).json({ error: "Missing assetId or animation" });
    }

    const scope = normalizeScope(projectScope);
    animationState[scope] ??= {};
    animationState[scope][assetId] = { animation, presetOverrides };
    broadcastAnimation({ assetId, animation, presetOverrides, projectScope: scope });

    return res.json({
      success: true,
      message: `Animation synced to ${sseClients.length} output client(s).`,
      assetId,
    });
  });

  app.post("/api/companion/data", companionJson, (req, res) => {
    const { assetId, data, projectScope } = req.body;

    if (!assetId || !data || typeof data !== "object") {
      return res.status(400).json({ error: "Missing assetId or data object" });
    }

    const prev = dataState[assetId]?.data ?? {};
    dataState[assetId] = {
      data: { ...prev, ...data },
      projectScope: typeof projectScope === "string" ? projectScope : dataState[assetId]?.projectScope,
    };
    broadcastData({
      assetId,
      data: dataState[assetId].data,
      projectScope: dataState[assetId].projectScope,
    });

    return res.json({
      success: true,
      message: `Overlay data synced to ${sseClients.length} output client(s).`,
      assetId,
    });
  });

  // Simple API server status
  app.get("/api/companion/status", (req, res) => {
    res.json({
      status: "active",
      connectedClients: sseClients.length,
    });
  });

  const httpServer = http.createServer(app);

  // Vite middleware for development — HMR di port HTTP yang sama (hindari bentrok 24678)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`(also http://127.0.0.1:${PORT} — use one URL consistently in every browser tab)`);
  });
}

startServer();
