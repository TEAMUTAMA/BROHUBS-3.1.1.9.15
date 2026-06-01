import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Track active EventSource (SSE) clients
  let sseClients: any[] = [];

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

  // Simple API server status
  app.get("/api/companion/status", (req, res) => {
    res.json({
      status: "active",
      connectedClients: sseClients.length,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
