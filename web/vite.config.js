import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE44_PREVIEW_MODE=1 => o preview é servido por HTTPS na porta 443 de um host
// público, então o websocket do HMR precisa usar essa porta externa.
const modoPreview = process.env.BASE44_PREVIEW_MODE === '1';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    hmr: modoPreview ? { clientPort: 443 } : undefined,
    // Chamadas /api passam pelo dev server, então o navegador só fala com a porta 3000.
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
