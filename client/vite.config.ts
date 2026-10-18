import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** In Docker dev the API lives at http://server:4000 inside the compose network. */
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Proxy API calls in dev so the browser never has to deal with CORS and
    // the httpOnly session cookie is sent on the same origin.
    proxy: {
      '/api': proxyTarget,
    },
  },
});
