import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import react from '@vitejs/plugin-react';

// Build layout (AD-14 bundle contract):
//   worker  →  dist/<workerName>/index.js  (discovered via generated wrangler.json)
//   client  →  dist/client/               (wrangler.jsonc assets.directory)
// The packaging step reads the generated wrangler.json to find both paths;
// no outDir override needed — the plugin uses its own default layout.
export default defineConfig({
  plugins: [cloudflare(), react()],
  ssr: {
    noExternal: ['@mfg-agent/apps'],
  },
});
