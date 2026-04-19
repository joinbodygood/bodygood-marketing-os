import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Load .env from the repo root — the server reads it from there too,
// so we keep a single env file instead of duplicating per workspace.
export default defineConfig({
  plugins: [react()],
  envDir: '..',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
