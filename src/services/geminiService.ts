/**
 * AI Assist — client.
 *
 * Kunci Gemini TIDAK pernah ada di sini. Browser hanya memanggil route server
 * `POST /api/ai/chat`; kunci aslinya dibaca dari GEMINI_API_KEY di sisi server
 * (lihat server/server.ts). Jangan pernah mengembalikan pemanggilan SDK Gemini
 * langsung dari client — apa pun yang di-import di sini ikut ke bundle publik.
 */

const AI_ENDPOINT = '/api/ai/chat';

const FALLBACK_UNAVAILABLE =
  'AI assistant is unavailable. Add GEMINI_API_KEY to .env.local (server side) to enable chat.';
const FALLBACK_ERROR = "I'm having a bit of trouble connecting right now. Please try again later.";

export const getAIResponse = async (prompt: string): Promise<string> => {
  try {
    const res = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (res.status === 503) return FALLBACK_UNAVAILABLE;

    if (res.status === 429) {
      return 'Terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar lalu coba lagi.';
    }

    if (!res.ok) {
      console.error('[ai] Server menolak permintaan:', res.status);
      return FALLBACK_ERROR;
    }

    const data = (await res.json()) as { text?: string };
    return data.text?.trim() || FALLBACK_ERROR;
  } catch (error) {
    console.error('[ai] Gagal menghubungi /api/ai/chat:', error);
    return FALLBACK_ERROR;
  }
};
