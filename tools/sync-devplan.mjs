// sync-devplan.mjs — Sinkron tugas "Update" (Firestore admin_tasks) → DevPlan.md
//
// Membaca koleksi `admin_tasks` dari Firebase Firestore (sumber data fitur Update di app),
// lalu menulis ringkasannya ke blok terkelola di Doc/DevPlan.md.
// Hanya isi di antara penanda START/END yang diganti — bagian tulisan tangan tetap utuh.
//
// Jalankan:  node tools/sync-devplan.mjs        (dari dalam folder App/)
// Aman gagal: jika offline / config kosong / Firestore error → DevPlan dibiarkan, exit 0.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url)); // .../App/tools
const APP_DIR = dirname(SCRIPT_DIR); // .../App
const REPO_ROOT = dirname(APP_DIR); // .../BROHUBS
const ENV_PATH = join(APP_DIR, '.env.local');
const DEVPLAN_PATH = join(REPO_ROOT, 'Doc', 'DevPlan.md');

const MARK_START = '<!-- AUTO:UPDATE-TASKS:START -->';
const MARK_END = '<!-- AUTO:UPDATE-TASKS:END -->';
const SECTION_HEADING = '## 📥 Dari Update (in-app) — otomatis';

const COLLECTION = 'admin_tasks';

// ── util ──────────────────────────────────────────────────────────────────────

function warn(msg) {
  console.warn(`[sync-devplan] ⚠️  ${msg}`);
}
function info(msg) {
  console.log(`[sync-devplan] ${msg}`);
}

/** Berhenti dengan aman (tidak menggagalkan simpan.cmd) */
function bailSafe(msg) {
  warn(msg);
  warn('DevPlan dibiarkan apa adanya. (exit 0)');
  process.exit(0);
}

/** Parse .env.local sederhana → { KEY: value } */
function parseEnv(path) {
  const out = {};
  if (!existsSync(path)) return out;
  const raw = readFileSync(path, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

// ── render markdown ───────────────────────────────────────────────────────────

const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const STATUS_RANK = {
  DEVELOPMENT: 0,
  TESTING: 1,
  RERELEASE_TESTING: 2,
  PLANNED: 3,
  COMING_SOON: 4,
  RELEASED: 5,
  CANCELLED: 9,
};
const STATUS_LABEL = {
  DEVELOPMENT: '🔨 Sedang dikembangkan',
  TESTING: '🧪 Pengujian',
  RERELEASE_TESTING: '🧪 Uji rilis ulang',
  PLANNED: '📋 Direncanakan',
  COMING_SOON: '🔜 Segera',
  RELEASED: '✅ Sudah rilis',
};
const STATUS_ORDER = ['DEVELOPMENT', 'TESTING', 'RERELEASE_TESTING', 'PLANNED', 'COMING_SOON'];

function prio(t) {
  return PRIORITY_RANK[t.priority] ?? 9;
}

function sortTasks(a, b) {
  const ps = prio(a) - prio(b);
  if (ps !== 0) return ps;
  return (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0);
}

function trunc(s, n) {
  if (!s) return '';
  const one = String(s).replace(/\s+/g, ' ').trim();
  return one.length > n ? one.slice(0, n - 1) + '…' : one;
}

function taskLine(t) {
  const target = t.targetVersion || t.version;
  const bits = [`_${t.status}_`, `${t.progressPercentage ?? 0}%`];
  if (target) bits.push(`target ${target}`);
  if (t.category) bits.push(t.category);
  let line = `- [ ] **[${t.priority}]** ${t.title} — ${bits.join(', ')}`;
  if (t.devNotes) line += `\n  - 🛠️ _${trunc(t.devNotes, 140)}_`;
  return line;
}

function renderBlock(tasks, stampISO) {
  const active = tasks.filter((t) => t.status !== 'CANCELLED');
  const lines = [];

  lines.push(MARK_START);
  lines.push(`> 🤖 _Auto-generate dari fitur **Update** (Firestore \`admin_tasks\`). Jangan edit manual di antara penanda ini — akan tertimpa saat sinkron._`);
  lines.push(`> 🕒 Sinkron terakhir: ${stampISO} · Total tugas aktif: ${active.length}`);
  lines.push('');

  if (active.length === 0) {
    lines.push('_Belum ada tugas di fitur Update, atau koleksi masih kosong._');
    lines.push('');
    lines.push(MARK_END);
    return lines.join('\n');
  }

  // 🎯 Saran berikutnya — utamakan yang sedang dikembangkan, lalu prioritas, lalu progres
  const candidates = active
    .filter((t) => t.status !== 'RELEASED')
    .slice()
    .sort((a, b) => {
      const ss = (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9);
      if (ss !== 0) return ss;
      return sortTasks(a, b);
    });

  if (candidates.length > 0) {
    lines.push('### 🎯 Saran berikutnya');
    const top = candidates.slice(0, 3);
    top.forEach((t, i) => {
      const target = t.targetVersion || t.version;
      const tag = i === 0 ? '**→ ' : '';
      const end = i === 0 ? '**' : '';
      lines.push(
        `${i + 1}. ${tag}${t.title}${end} — [${t.priority}] · ${t.status} · ${t.progressPercentage ?? 0}%${target ? ` · ${target}` : ''}`
      );
    });
    lines.push('');
  }

  // Kelompok per status
  const byStatus = new Map();
  for (const t of active) {
    if (!byStatus.has(t.status)) byStatus.set(t.status, []);
    byStatus.get(t.status).push(t);
  }

  for (const status of STATUS_ORDER) {
    const group = byStatus.get(status);
    if (!group || group.length === 0) continue;
    group.sort(sortTasks);
    lines.push(`### ${STATUS_LABEL[status] ?? status} (${group.length})`);
    for (const t of group) lines.push(taskLine(t));
    lines.push('');
  }

  // RELEASED diringkas
  const released = byStatus.get('RELEASED');
  if (released && released.length > 0) {
    released.sort(sortTasks);
    lines.push(`### ${STATUS_LABEL.RELEASED} (${released.length})`);
    for (const t of released) {
      const v = t.version || t.targetVersion || '';
      lines.push(`- [x] ${t.title}${v ? ` — ${v}` : ''}`);
    }
    lines.push('');
  }

  lines.push(MARK_END);
  return lines.join('\n');
}

/** Sisipkan/ganti blok terkelola di dalam isi DevPlan.md */
function applyBlock(original, block) {
  const si = original.indexOf(MARK_START);
  const ei = original.indexOf(MARK_END);

  if (si !== -1 && ei !== -1 && ei > si) {
    // Ganti isi lama (termasuk penanda) dengan blok baru
    const before = original.slice(0, si);
    const after = original.slice(ei + MARK_END.length);
    return before + block + after;
  }

  // Penanda belum ada → sisipkan section baru sebelum "## ✅ DONE", atau di akhir
  const section = `${SECTION_HEADING}\n\n${block}\n`;
  const doneIdx = original.indexOf('## ✅ DONE');
  if (doneIdx !== -1) {
    return original.slice(0, doneIdx) + section + '\n' + original.slice(doneIdx);
  }
  const sep = original.endsWith('\n') ? '\n' : '\n\n';
  return original + sep + section;
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(DEVPLAN_PATH)) {
    bailSafe(`DevPlan tidak ditemukan: ${DEVPLAN_PATH}`);
  }

  const env = parseEnv(ENV_PATH);
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!apiKey || !projectId) {
    bailSafe(`Config Firebase kosong di ${ENV_PATH} (butuh VITE_FIREBASE_API_KEY & VITE_FIREBASE_PROJECT_ID).`);
  }

  const config = {
    apiKey,
    projectId,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || `${projectId}.firebaseapp.com`,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || `${projectId}.appspot.com`,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || '',
    appId: env.VITE_FIREBASE_APP_ID?.trim() || '',
  };

  let tasks = [];
  try {
    const { initializeApp } = await import('firebase/app');
    const { initializeFirestore, getFirestore, collection, getDocs } = await import('firebase/firestore');

    const app = initializeApp(config);
    let db;
    try {
      // Cocokkan dengan app: long-polling agar andal di Node (bukan browser).
      db = initializeFirestore(app, { experimentalForceLongPolling: true });
    } catch {
      db = getFirestore(app);
    }

    info(`Membaca koleksi "${COLLECTION}" dari Firestore (project ${projectId})…`);
    const snap = await getDocs(collection(db, COLLECTION));
    tasks = snap.docs.map((d) => d.data());
    info(`Dapat ${tasks.length} tugas.`);
  } catch (e) {
    bailSafe(`Gagal membaca Firestore: ${e?.message || e}`);
  }

  // Cap waktu lokal (YYYY-MM-DD HH:mm) — Node, jadi Date aman dipakai.
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const block = renderBlock(tasks, stamp);

  const original = readFileSync(DEVPLAN_PATH, 'utf8');
  const updated = applyBlock(original, block);

  if (updated === original) {
    info('DevPlan sudah mutakhir — tidak ada perubahan.');
  } else {
    writeFileSync(DEVPLAN_PATH, updated, 'utf8');
    info(`DevPlan diperbarui: ${DEVPLAN_PATH}`);
  }

  process.exit(0);
}

main().catch((e) => bailSafe(`Error tak terduga: ${e?.message || e}`));
