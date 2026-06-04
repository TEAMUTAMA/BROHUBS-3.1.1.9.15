import http from "http";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Track active EventSource (SSE) clients
  let sseClients: any[] = [];

  // Latest animation config per asset (synced to OBS / output links)
  const animationState: Record<
    string,
    { animation: unknown; presetOverrides?: unknown }
  > = {};

  const broadcastAnimation = (payload: object) => {
    const data = JSON.stringify(payload);
    sseClients.forEach((client) => {
      client.write(`event: animation\ndata: ${data}\n\n`);
    });
  };

  const replayAnimationState = (client: any) => {
    Object.entries(animationState).forEach(([assetId, state]) => {
      const payload = JSON.stringify({ assetId, ...state });
      client.write(`event: animation\ndata: ${payload}\n\n`);
    });
  };

  // Latest overlay data per asset (teams, players, layout, etc.)
  const dataState: Record<string, Record<string, unknown>> = {};

  const broadcastData = (payload: object) => {
    const line = JSON.stringify(payload);
    sseClients.forEach((client) => {
      client.write(`event: data\ndata: ${line}\n\n`);
    });
  };

  const replayDataState = (client: any) => {
    Object.entries(dataState).forEach(([assetId, data]) => {
      const payload = JSON.stringify({ assetId, data });
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
    const { assetId, action, layer } = req.query;

    if (!assetId) {
      return res.status(400).json({ error: "Missing assetId" });
    }

    // Broadcast trigger payload to all active SSE clients
    const payload = JSON.stringify({
      assetId,
      action: action || "toggle", // 'play', 'stop', 'toggle'
      layer: layer ? parseInt(layer as string, 10) : undefined,
    });

    sseClients.forEach((client) => {
      client.write(`event: trigger\ndata: ${payload}\n\n`);
    });

    return res.json({
      success: true,
      message: `Trigger sent to ${sseClients.length} active broadcast overlays/dashboards.`,
      payload: { assetId, action, layer },
    });
  });

  // Supporting POST method too for modular controls
  app.post("/api/companion/trigger", express.json(), (req, res) => {
    const { assetId, action, layer } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: "Missing assetId" });
    }

    const payload = JSON.stringify({
      assetId,
      action: action || "toggle",
      layer: layer ? parseInt(layer, 10) : undefined,
    });

    sseClients.forEach((client) => {
      client.write(`event: trigger\ndata: ${payload}\n\n`);
    });

    return res.json({
      success: true,
      message: `Trigger sent to ${sseClients.length} active broadcast overlays/dashboards.`,
      payload: { assetId, action, layer },
    });
  });

  app.post("/api/companion/animation", express.json(), (req, res) => {
    const { assetId, animation, presetOverrides } = req.body;

    if (!assetId || !animation) {
      return res.status(400).json({ error: "Missing assetId or animation" });
    }

    animationState[assetId] = { animation, presetOverrides };
    broadcastAnimation({ assetId, animation, presetOverrides });

    return res.json({
      success: true,
      message: `Animation synced to ${sseClients.length} output client(s).`,
      assetId,
    });
  });

  app.post("/api/companion/data", express.json(), (req, res) => {
    const { assetId, data } = req.body;

    if (!assetId || !data || typeof data !== "object") {
      return res.status(400).json({ error: "Missing assetId or data object" });
    }

    dataState[assetId] = { ...(dataState[assetId] || {}), ...data };
    broadcastData({ assetId, data: dataState[assetId] });

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
