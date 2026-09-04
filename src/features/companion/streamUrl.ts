/**
 * URL koneksi SSE companion, lengkap dengan penyaring scope.
 *
 * Server menyimpan state program/animasi/data per project dan memutarnya ulang
 * ke setiap koneksi baru. Tanpa `?projectScope=`, satu Browser Source OBS akan
 * menerima seluruh isi state server — termasuk milik project yang sudah dihapus,
 * karena state itu tidak pernah dibersihkan (T-02 di audit).
 *
 * Scope kosong tetap didukung dan artinya "kirim semuanya", supaya pemanggil
 * yang memang belum tahu project-nya tidak berubah perilakunya.
 */
export const companionStreamUrl = (projectScope?: string | null): string =>
  projectScope
    ? `/api/companion/stream?projectScope=${encodeURIComponent(projectScope)}`
    : '/api/companion/stream';
