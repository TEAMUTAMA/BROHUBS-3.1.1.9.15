import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      // CATATAN KEAMANAN: jangan pernah menaruh kunci rahasia di `define`.
      // `define` mengganti teks saat build, jadi nilainya jadi string literal di
      // dalam dist/assets/*.js dan bisa dibaca siapa pun. Kunci Gemini sekarang
      // hidup di sisi server (server/server.ts → POST /api/ai/chat).
      // Hanya variabel berawalan VITE_ yang memang aman untuk publik.
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
