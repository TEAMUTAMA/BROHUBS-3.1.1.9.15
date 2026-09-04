import http from "http";
import crypto from "crypto";
import fs from "fs";
import express from "express";
import type { RequestHandler, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { slugify } from "../src/lib/slugify";

/**
 * Muat .env.local / .env ke process.env.
 *
 * .env.example menjanjikan variabel tanpa awalan VITE_ "hanya dibaca proses
 * server (server/server.ts)" — tapi tidak ada yang pernah memuatnya. Akibatnya
 * GEMINI_API_KEY, BROHUBS_API_KEY, dan kawan-kawan diam-diam selalu kosong
 * kecuali kebetulan sudah ada di environment shell.
 *
 * Sengaja tanpa dependensi dotenv: yang dibutuhkan cuma `KUNCI=nilai`, dan
 * variabel yang sudah ada di environment asli tetap menang supaya setelan
 * per-deploy tidak tertimpa file lokal.
 */
const loadEnvFile = (file: string) => {
  const filePath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
};
loadEnvFile(".env.local");
loadEnvFile(".env");

// ─── Konfigurasi keamanan (semua opsional — kosong = perilaku lama) ──────────
//
// BROHUBS_API_KEY         token bersama untuk SEMUA endpoint yang mengubah state.
//                         Kosong = tidak ada pemeriksaan (mode lama, hanya untuk
//                         jaringan studio tertutup).
// BROHUBS_ALLOWED_ORIGINS daftar origin dipisah koma. Kosong = izinkan semua.
// HOST                    alamat bind. Default 0.0.0.0 supaya Companion/OBS di PC
//                         lain tetap bisa terhubung. Isi 127.0.0.1 untuk mengunci
//                         ke satu PC saja.
// GEMINI_API_KEY          kunci Gemini — HANYA dibaca di sisi server, tidak pernah
//                         ikut ke bundle browser.

const API_TOKEN = (process.env.BROHUBS_API_KEY ?? "").trim();
const ALLOWED_ORIGINS = (process.env.BROHUBS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const HOST = (process.env.HOST ?? "").trim() || "0.0.0.0";

/** Perbandingan token yang tidak membocorkan panjang/isi lewat selisih waktu. */
const tokensMatch = (supplied: string, expected: string) => {
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const companionJson = express.json({ limit: "25mb" });

  // Track active EventSource (SSE) clients
  let sseClients: Response[] = [];

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

  /**
   * Klien SSE hanya boleh menerima ulang state milik project-nya sendiri.
   *
   * Tanpa penyaringan ini, setiap koneksi baru — termasuk SETIAP Browser Source
   * OBS yang dibuka — menerima seluruh isi state server, termasuk milik project
   * yang sudah lama dihapus. State di sini tidak pernah dibersihkan saat project
   * dihapus (lihat T-02 di audit), jadi tumpukannya hanya bertambah.
   *
   * Klien lama tidak mengirim ?projectScope=, dan untuk mereka perilakunya tetap
   * seperti dulu: kirim semuanya.
   */
  const scopeAllowed = (requested: string | null, scope: string) =>
    !requested || scope === requested || scope === "GLOBAL";

  const replayProgramState = (client: Response, requestedScope: string | null = null) => {
    Object.entries(programState).forEach(([projectScope, layers]) => {
      if (!scopeAllowed(requestedScope, projectScope)) return;
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

  const replayAnimationState = (client: Response, requestedScope: string | null = null) => {
    Object.entries(animationState).forEach(([projectScope, assets]) => {
      if (!scopeAllowed(requestedScope, projectScope)) return;
      Object.entries(assets).forEach(([assetId, state]) => {
        const payload = JSON.stringify({ assetId, ...state, projectScope });
        client.write(`event: animation\ndata: ${payload}\n\n`);
      });
    });
  };

  // Latest overlay data per project and asset. Like program and animation state,
  // telemetry must never leak between two concurrently running projects.
  const dataState: Record<string, Record<string, { data: Record<string, unknown> }>> = {};

  const broadcastData = (payload: object) => {
    const line = JSON.stringify(payload);
    sseClients.forEach((client) => {
      client.write(`event: data\ndata: ${line}\n\n`);
    });
  };

  const replayDataState = (client: Response, requestedScope: string | null = null) => {
    Object.entries(dataState).forEach(([projectScope, assets]) => {
      if (!scopeAllowed(requestedScope, projectScope)) return;
      Object.entries(assets).forEach(([assetId, entry]) => {
        const payload = JSON.stringify({
          assetId,
          data: entry.data,
          projectScope,
        });
        client.write(`event: data\ndata: ${payload}\n\n`);
      });
    });
  };

  // ─── CORS: allowlist kalau diisi, izinkan semua kalau kosong ──────────────
  app.use("/api", (req, res, next) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.length === 0) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    // Authorization dipakai /api/admin/* untuk mengirim token sesi Supabase.
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Brohubs-Key, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  /**
   * Penjaga untuk endpoint yang MENGUBAH state siaran.
   *
   * Token bisa dikirim lewat header `X-Brohubs-Key` (disarankan) atau query
   * `?key=` — Bitfocus Companion memicu lewat URL biasa, jadi query tetap
   * didukung. Selama BROHUBS_API_KEY belum diisi, semua permintaan lolos
   * seperti sebelumnya supaya setup yang sedang jalan tidak mendadak putus.
   */
  const requireApiToken: RequestHandler = (req, res, next) => {
    if (!API_TOKEN) {
      next();
      return;
    }
    const supplied =
      (req.header("x-brohubs-key") ?? "").trim() || String(req.query.key ?? "").trim();

    if (supplied && tokensMatch(supplied, API_TOKEN)) {
      next();
      return;
    }
    res.status(401).json({
      error: "Unauthorized — kirim token lewat header X-Brohubs-Key atau query ?key=",
    });
  };

  // API Route for SSE connection
  app.get("/api/companion/stream", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    // Add to active clients list
    sseClients.push(res);

    const requestedScope = String(req.query.projectScope ?? "").trim() || null;
    replayProgramState(res, requestedScope);
    replayAnimationState(res, requestedScope);
    replayDataState(res, requestedScope);

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
  app.get("/api/companion/trigger", requireApiToken, (req, res) => {
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
  app.post("/api/companion/trigger", requireApiToken, companionJson, (req, res) => {
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

  app.post("/api/companion/animation", requireApiToken, companionJson, (req, res) => {
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

  app.post("/api/companion/data", requireApiToken, companionJson, (req, res) => {
    const { assetId, data, projectScope } = req.body;

    if (!assetId || !data || typeof data !== "object") {
      return res.status(400).json({ error: "Missing assetId or data object" });
    }

    const scope = normalizeScope(projectScope);
    dataState[scope] ??= {};
    const prev = dataState[scope][assetId]?.data ?? {};
    dataState[scope][assetId] = {
      data: { ...prev, ...data },
    };
    broadcastData({
      assetId,
      data: dataState[scope][assetId].data,
      projectScope: scope,
    });

    return res.json({
      success: true,
      message: `Overlay data synced to ${sseClients.length} output client(s).`,
      assetId,
    });
  });

  /**
   * PUBG telemetry ingestion (demo phase).
   *
   * A producer can post a complete current leaderboard snapshot. The server
   * validates its envelope, publishes it to the control desk, and mirrors it
   * into the existing companion data channel used by OBS/vMix output links.
   */
  app.post("/api/telemetry/pubg", requireApiToken, companionJson, (req, res) => {
    const { projectScope, teams, currentMatch, title } = req.body;
    if (!Array.isArray(teams) || teams.length < 1 || teams.length > 16) {
      return res.status(400).json({ error: "teams must contain between 1 and 16 leaderboard entries" });
    }
    if (
      teams.some(
        (team) =>
          !team ||
          typeof team !== "object" ||
          typeof team.team !== "string" ||
          !team.team.trim() ||
          !Number.isFinite(Number(team.rank)) ||
          Number(team.rank) < 1
      )
    ) {
      return res.status(400).json({ error: "every team requires a name and positive rank" });
    }
    if (currentMatch !== undefined && (!Number.isInteger(currentMatch) || currentMatch < 1)) {
      return res.status(400).json({ error: "currentMatch must be a positive integer" });
    }
    if (title !== undefined && (typeof title !== "string" || title.length > 120)) {
      return res.status(400).json({ error: "title must be a string up to 120 characters" });
    }

    const scope = normalizeScope(projectScope);
    const data: Record<string, unknown> = { BROHUBS_LEADERBOARD_TEAMS: teams };
    if (currentMatch !== undefined) data.BROHUBS_LEADERBOARD_MATCH = currentMatch;
    if (title !== undefined) data.BROHUBS_LEADERBOARD_TITLE = title;

    dataState[scope] ??= {};
    const previous = dataState[scope]["pmgc-leaderboard"]?.data ?? {};
    dataState[scope]["pmgc-leaderboard"] = { data: { ...previous, ...data } };

    const payload = { assetId: "pmgc-leaderboard", data: dataState[scope]["pmgc-leaderboard"].data, projectScope: scope };
    broadcastData(payload);
    const telemetry = JSON.stringify({ teams, currentMatch, title, projectScope: scope });
    sseClients.forEach((client) => client.write(`event: pubg-telemetry\ndata: ${telemetry}\n\n`));

    return res.status(202).json({
      accepted: true,
      projectScope: scope,
      teams: teams.length,
      connectedClients: sseClients.length,
    });
  });

  /**
   * Gemini AI assist — kunci API hidup DI SINI, tidak pernah ikut ke browser.
   *
   * Endpoint ini sengaja tidak memakai requireApiToken: AI Assist dipakai dari
   * halaman publik, dan token apa pun yang ditaruh di browser otomatis ikut
   * terbaca siapa saja. Pengamannya rate limit per IP + batas panjang prompt.
   * Setelah autentikasi terpasang, ganti jadi wajib sesi login.
   */
  const aiJson = express.json({ limit: "16kb" });
  const AI_WINDOW_MS = 60_000;
  const AI_MAX_PER_WINDOW = 10;
  const AI_PROMPT_MAX_CHARS = 2000;
  const aiHits = new Map<string, { count: number; resetAt: number }>();

  const aiRateLimited = (ip: string) => {
    const now = Date.now();
    for (const [key, hit] of aiHits) {
      if (hit.resetAt <= now) aiHits.delete(key);
    }
    const current = aiHits.get(ip);
    if (!current || current.resetAt <= now) {
      aiHits.set(ip, { count: 1, resetAt: now + AI_WINDOW_MS });
      return false;
    }
    current.count += 1;
    return current.count > AI_MAX_PER_WINDOW;
  };

  const AI_SYSTEM_INSTRUCTION =
    "You are the AI assistant for BROHUBS, the premium high-performance broadcasting platform for digital creators. You represent BROHUBS (all caps). You are professional, tech-forward, and extremely knowledgeable about streaming technology. You focus on explaining BROHUBS features like 4K 60FPS streaming, white-label branding, ultra-low latency toolkit, and smart automation for studios. Your goal is to make creators feel like BROHUBS is their ultimate studio partner.";

  let genaiClient: unknown = null;
  const getGenaiClient = async () => {
    const apiKey = (process.env.GEMINI_API_KEY ?? process.env.API_KEY ?? "").trim();
    if (!apiKey) return null;
    if (!genaiClient) {
      const { GoogleGenAI } = await import("@google/genai");
      genaiClient = new GoogleGenAI({ apiKey });
    }
    return genaiClient as { models: { generateContent: (args: object) => Promise<{ text?: string }> } };
  };

  app.post("/api/ai/chat", aiJson, async (req, res) => {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }
    if (prompt.length > AI_PROMPT_MAX_CHARS) {
      return res
        .status(413)
        .json({ error: `Prompt melebihi ${AI_PROMPT_MAX_CHARS} karakter` });
    }
    if (aiRateLimited(req.ip ?? "unknown")) {
      return res
        .status(429)
        .json({ error: "Terlalu banyak permintaan. Coba lagi sebentar lagi." });
    }

    const client = await getGenaiClient();
    if (!client) {
      return res.status(503).json({
        error: "AI assistant belum aktif. Isi GEMINI_API_KEY di .env.local (sisi server).",
      });
    }

    try {
      const response = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { systemInstruction: AI_SYSTEM_INSTRUCTION, temperature: 0.7 },
      });
      return res.json({ text: response.text ?? "" });
    } catch (error) {
      console.error("[ai] Gemini API error:", error);
      return res.status(502).json({ error: "Gagal menghubungi layanan AI." });
    }
  });

  // ─── Admin: buat akun member ──────────────────────────────────────────────
  //
  // Kenapa lewat server dan bukan langsung dari dashboard:
  //   Membuat akun butuh service_role key, dan kunci itu melewati SELURUH RLS.
  //   Kalau ia ada di browser, siapa pun yang membuka DevTools bisa membaca dan
  //   menulis seluruh database. Jadi kuncinya tinggal di sini, dan browser cuma
  //   boleh meminta lewat endpoint ini.
  //
  // Yang memanggil tetap harus membuktikan dirinya admin: token sesi Supabase
  // miliknya diverifikasi ke Supabase, lalu perannya dibaca dari `profiles`.
  // Tanpa itu, endpoint ini jadi pintu belakang pembuatan akun tanpa login.

  const SUPABASE_URL = (
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    ""
  ).trim().replace(/\/+$/, "");
  const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  const adminJson = express.json({ limit: "16kb" });

  const serviceHeaders = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };

  /** Password acak yang memenuhi syarat umum bila admin tidak menentukan sendiri. */
  const generatePassword = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    return Array.from(crypto.randomBytes(16), (byte) => alphabet[byte % alphabet.length]).join("");
  };

  /**
   * Pastikan pemanggil punya sesi Supabase yang sah DAN berperan admin.
   * Mengembalikan pesan error bila tidak, atau null bila lolos.
   */
  const rejectIfNotAdmin = async (req: express.Request): Promise<string | null> => {
    const accessToken = (req.header("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) return "Tidak ada sesi. Login ulang sebagai admin.";

    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${accessToken}` },
    });
    if (!userResponse.ok) return "Sesi tidak berlaku. Login ulang.";

    const user = (await userResponse.json()) as { id?: string };
    if (!user.id) return "Sesi tidak berlaku. Login ulang.";

    const profileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`,
      { headers: serviceHeaders },
    );
    if (!profileResponse.ok) return "Gagal memeriksa peran pemanggil.";

    const rows = (await profileResponse.json()) as Array<{ role?: string }>;
    if (rows[0]?.role !== "admin") return "Hanya admin yang boleh membuat akun member.";

    return null;
  };

  app.post("/api/admin/members", adminJson, async (req, res) => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return res.status(503).json({
        error:
          "Server belum bisa membuat akun: isi SUPABASE_SERVICE_ROLE_KEY di .env.local " +
          "(tanpa awalan VITE_) lalu jalankan ulang npm run dev.",
      });
    }

    const denial = await rejectIfNotAdmin(req).catch(() => "Gagal menghubungi Supabase.");
    if (denial) return res.status(403).json({ error: denial });

    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const name = String(req.body?.name ?? "").trim();
    const pkg = String(req.body?.package ?? "BASIC").toUpperCase();
    const months = Number(req.body?.durationMonths ?? 1);
    const password = String(req.body?.password ?? "").trim() || generatePassword();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Email tidak valid." });
    }
    if (!name) return res.status(400).json({ error: "Nama wajib diisi." });
    if (!["BASIC", "PREMIUM", "ULTIMATE"].includes(pkg)) {
      return res.status(400).json({ error: "Paket harus BASIC, PREMIUM, atau ULTIMATE." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password minimal 6 karakter." });
    }

    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + (Number.isFinite(months) && months > 0 ? months : 1));
    const expiryDate = expiry.toISOString().slice(0, 10);

    try {
      // email_confirm: true — tanpa ini akun menunggu klik email konfirmasi dan
      // tidak bisa login sama sekali.
      const createResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
        method: "POST",
        headers: serviceHeaders,
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        }),
      });

      const created = (await createResponse.json()) as { id?: string; msg?: string; message?: string };

      if (!createResponse.ok || !created.id) {
        const message = created.msg ?? created.message ?? "Gagal membuat akun.";
        const conflict = /already|registered|exists/i.test(message);
        return res.status(conflict ? 409 : 502).json({
          error: conflict ? `Email ${email} sudah terdaftar.` : message,
        });
      }

      // Trigger on_auth_user_created sudah menyiapkan baris profil; di sini
      // tinggal mengisi paket dan masa aktifnya.
      const profilePayload = {
        email: email.toUpperCase(),
        name,
        role: "member",
        package: pkg,
        initial: name.slice(0, 1).toUpperCase(),
        expiry_date: expiryDate,
        status: "OFFLINE",
      };

      const patchResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${created.id}`,
        {
          method: "PATCH",
          headers: { ...serviceHeaders, Prefer: "return=minimal" },
          body: JSON.stringify(profilePayload),
        },
      );

      if (!patchResponse.ok) {
        const detail = await patchResponse.text();
        console.error("[admin] Gagal menulis profil:", detail);
        return res.status(502).json({
          error: "Akun dibuat tapi profilnya gagal disimpan. Cek Supabase.",
        });
      }

      return res.status(201).json({
        password,
        member: {
          name,
          email: email.toUpperCase(),
          status: "OFFLINE",
          package: pkg,
          initial: profilePayload.initial,
          expiryDate,
        },
      });
    } catch (error) {
      console.error("[admin] Gagal membuat member:", error);
      return res.status(502).json({ error: "Gagal menghubungi Supabase." });
    }
  });

  /**
   * Setel ulang password seorang member, dan kembalikan password barunya supaya
   * admin bisa menyerahkannya langsung.
   *
   * Dashboard sebelumnya "mereset" password dengan memanggil
   * generateSystemPassword() di browser lalu menampilkannya. Tidak ada apa pun
   * yang berubah di Supabase, jadi password yang diserahkan admin ke member
   * tidak pernah bisa dipakai login.
   */
  app.post("/api/admin/members/password", adminJson, async (req, res) => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return res.status(503).json({
        error:
          "Server belum bisa mereset password: isi SUPABASE_SERVICE_ROLE_KEY di " +
          ".env.local (tanpa awalan VITE_) lalu jalankan ulang npm run dev.",
      });
    }

    const denial = await rejectIfNotAdmin(req).catch(() => "Gagal menghubungi Supabase.");
    if (denial) return res.status(403).json({ error: denial });

    const email = String(req.body?.email ?? "").trim().toUpperCase();
    const password = String(req.body?.password ?? "").trim() || generatePassword();

    if (!email) return res.status(400).json({ error: "Email wajib diisi." });
    if (password.length < 6) {
      return res.status(400).json({ error: "Password minimal 6 karakter." });
    }

    try {
      // Admin API GoTrue tidak bisa mencari user berdasarkan email, jadi id-nya
      // diambil dari profiles — kolom email di sana unik dan huruf besar.
      const lookup = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`,
        { headers: serviceHeaders },
      );
      const rows = (await lookup.json()) as Array<{ id?: string }>;
      const userId = rows[0]?.id;

      if (!userId) {
        return res.status(404).json({ error: `Tidak ada akun dengan email ${email}.` });
      }

      const update = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: "PUT",
        headers: serviceHeaders,
        body: JSON.stringify({ password }),
      });

      if (!update.ok) {
        const detail = await update.text();
        console.error("[admin] Gagal reset password:", detail);
        return res.status(502).json({ error: "Supabase menolak perubahan password." });
      }

      return res.json({ email, password });
    } catch (error) {
      console.error("[admin] Gagal reset password:", error);
      return res.status(502).json({ error: "Gagal menghubungi Supabase." });
    }
  });

  /**
   * Terjemahkan slug project di URL output menjadi id project.
   *
   *   GET /api/output/resolve?project=projeect-a&member=andi  →  { projectId }
   *
   * Kenapa harus lewat server:
   *   Halaman `/o/...` dibuka OBS/vMix TANPA login. Dalam keadaan itu klien
   *   Supabase memakai kunci anon, dan RLS `user_projects` hanya mengizinkan
   *   pemilik — jadi pencarian slug selalu mengembalikan daftar kosong.
   *   Fallback berikutnya membaca localStorage, dan browser bawaan OBS punya
   *   penyimpanan sendiri yang selalu kosong. Hasilnya scope diam-diam jatuh ke
   *   GLOBAL dan overlay menampilkan data yang salah tanpa satu pun pesan error.
   *
   * Yang dibuka ke publik hanya pemetaan slug → id, dan slug itu sudah ada di
   * URL yang dipegang pemakainya. Nama project milik orang lain tidak ikut
   * dikembalikan.
   */
  app.get("/api/output/resolve", async (req, res) => {
    const projectSlug = String(req.query.project ?? "").trim().toLowerCase();
    const memberSlug = String(req.query.member ?? "").trim().toLowerCase();

    if (!projectSlug) {
      return res.status(400).json({ error: "Parameter ?project= (slug) wajib diisi." });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return res.status(503).json({
        error: "Server belum bisa menerjemahkan slug: SUPABASE_SERVICE_ROLE_KEY belum diisi.",
      });
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_projects?select=owner_email,projects`,
        { headers: serviceHeaders },
      );
      if (!response.ok) {
        return res.status(502).json({ error: "Gagal membaca daftar project." });
      }

      const rows = (await response.json()) as Array<{
        owner_email?: string;
        projects?: Array<{ id?: string; name?: string }>;
      }>;

      // Segmen bisa berbentuk "projeect-a-4i2m2j" (baru) atau "projeect-a"
      // (link lama). Id tidak pernah mengandung tanda hubung — asalnya
      // Math.random().toString(36) — jadi potongan setelah tanda hubung
      // TERAKHIR adalah calon id. Calon itu tidak dipercaya begitu saja: slug
      // seperti "grand-final" juga berakhiran kata yang menyerupai id, jadi
      // kecocokannya harus dibuktikan ke data.
      const lastDash = projectSlug.lastIndexOf("-");
      const candidateId = lastDash > 0 ? projectSlug.slice(lastDash + 1) : "";
      const slugWithoutId = lastDash > 0 ? projectSlug.slice(0, lastDash) : "";

      // Dua lintasan, dan urutannya penting. Kalau id dan slug diperiksa dalam
      // satu lintasan, project yang namanya cocok bisa menang lebih dulu
      // padahal ada project lain di bawahnya yang id-nya persis diminta —
      // persis kasus dua "PROJECT B" milik satu member.

      // Lintasan 1: id — penanda pasti. Ini juga yang membuat link tetap hidup
      // setelah project diganti nama: slug di path boleh basi, id tetap cocok.
      if (candidateId) {
        for (const row of rows) {
          for (const project of row.projects ?? []) {
            if (project?.id === candidateId) {
              return res.json({ projectId: project.id, matchedBy: "id" });
            }
          }
        }
      }

      // Lintasan 2: nama. Nama project TIDAK unik — bahkan dalam satu member
      // bisa ada dua "PROJECT B" — jadi ini best-effort: member di URL dipakai
      // mempersempit, sisanya yang pertama ketemu.
      let slugMatchOtherOwner: string | null = null;

      for (const row of rows) {
        const ownerSlug = slugify(String(row.owner_email ?? "").split("@")[0]);
        for (const project of row.projects ?? []) {
          if (!project?.id || !project?.name) continue;

          const nameSlug = slugify(project.name);
          if (nameSlug !== projectSlug && nameSlug !== slugWithoutId) continue;

          if (!memberSlug || ownerSlug === memberSlug) {
            return res.json({ projectId: project.id, matchedBy: "slug" });
          }
          if (!slugMatchOtherOwner) slugMatchOtherOwner = project.id;
        }
      }

      if (slugMatchOtherOwner) {
        return res.json({ projectId: slugMatchOtherOwner, matchedBy: "slug" });
      }
      return res.status(404).json({ error: `Tidak ada project dengan slug "${projectSlug}".` });
    } catch (error) {
      console.error("[output] Gagal menerjemahkan slug:", error);
      return res.status(502).json({ error: "Gagal menghubungi Supabase." });
    }
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

  httpServer.listen(PORT, HOST, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`(also http://127.0.0.1:${PORT} — use one URL consistently in every browser tab)`);
    console.log(
      `[keamanan] token endpoint: ${API_TOKEN ? "AKTIF" : "MATI"} · ` +
        `CORS: ${ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS.join(", ") : "semua origin"} · ` +
        `bind: ${HOST}`
    );
    if (!API_TOKEN && HOST === "0.0.0.0") {
      console.warn(
        "[keamanan] PERINGATAN: server terbuka ke seluruh jaringan tanpa token. " +
          "Siapa pun di jaringan yang sama bisa memicu/mematikan overlay. " +
          "Isi BROHUBS_API_KEY di .env.local sebelum dipakai di venue atau jaringan publik."
      );
    }
  });
}

startServer();
