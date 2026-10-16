import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy API calls in dev so the browser never has to deal with CORS.
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
