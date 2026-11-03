import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // If a request reaches the proxy before Express is listening (or
        // after it stops), answer with the JSON shape the React client
        // expects instead of a raw ECONNREFUSED proxy error.
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && typeof res.writeHead === 'function' && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  message:
                    'API is not reachable yet. Make sure the Express server is running (npm run dev).',
                })
              );
            }
          });
        },
      },
    },
  },
});
