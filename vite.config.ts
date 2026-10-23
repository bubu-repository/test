import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5173,
    host: true,
    // When `npm run serve` (the Node API) is running on :8787 the dev server proxies to it.
    // If it is not running, the client transparently falls back to local storage.
    proxy: { '/api': { target: 'http://localhost:8787', changeOrigin: true } },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // only the Vault uses 3D: keep three.js and its React bindings out of the first load
        // (React gets its own chunk, otherwise Rollup folds it into the 3D chunk it also feeds)
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler|zustand|use-sync-external-store)\//.test(id) || /preload-helper|commonjsHelpers/.test(id)) return 'react';
          if (/node_modules\/three\//.test(id)) return 'three';
          if (/node_modules\/(@react-three|postprocessing|three-stdlib|@monogrid|troika|maath|meshline|camera-controls|three-mesh-bvh)/.test(id)) return 'r3f';
        },
      },
    },
  },
});
