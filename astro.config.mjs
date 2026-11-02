import { defineConfig } from 'astro/config';

// SITE_URL overrides the default once a custom domain is attached
// (Cloudflare Pages -> Settings -> Environment variables).
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://d3athbybubz.pages.dev',
  output: 'static',
  compressHTML: true,
  devToolbar: { enabled: false },
  vite: {
    // Never inline assets or scripts: keeps the strict CSP in public/_headers valid.
    build: { assetsInlineLimit: 0 },
  },
});
