import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/auth-api': {
        target: 'http://localhost:7070',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth-api/, ''),
      },
      '/user-api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/user-api/, ''),
      },
      '/event-api': {
        target: 'http://localhost:5234',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/event-api/, ''),
      },
      '/reservation-api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/reservation-api/, ''),
      },
    },
  },
});
