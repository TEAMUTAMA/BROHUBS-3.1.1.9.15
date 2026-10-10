/**
 * Satu-satunya definisi slug untuk URL output.
 *
 * File ini sengaja tidak mengimpor apa pun. Ia dipakai browser (lewat
 * lib/outputRoute.ts) DAN proses server (server/server.ts) untuk menerjemahkan
 * slug project di URL `/o/...` menjadi id. Kalau kedua sisi memakai aturan slug
 * yang berbeda sedikit saja, link output berhenti cocok dan overlay jatuh ke
 * scope GLOBAL tanpa pesan apa pun.
 *
 * Sebelumnya aturan ini disalin di tiga tempat: lib/outputRoute.ts,
 * MemberOutputView.tsx, dan MasterOutputView.tsx (yang terakhir bahkan sudah
 * tidak terpakai).
 */
export const slugify = (text: string): string =>
  text.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
