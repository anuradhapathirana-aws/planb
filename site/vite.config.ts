import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/*
 * The PUBLIC website + student portal (planbinternational.lk).
 *
 * Deliberately NOT part of `web/`: that app is the admin panel and ships on its
 * own subdomain. Keeping them apart means admin code never lands on the public
 * host, the marketing bundle never inherits the admin's dependency graph
 * (TanStack Table, TipTap, Recharts, tus), and the two Sanctum sessions are
 * separated by origin. See docs/WEBSITE_AND_PORTAL_GUIDE.md §2.
 *
 * No `vite-plugin-pwa` here. `web/` is installable because an admin uses it like
 * an app; a marketing site that must rank on Google does not want a service
 * worker serving stale pages to a first-time visitor.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // Source-only package shared with web/ and mobile/ — see root CLAUDE.md §2.
      // Vite compiles it from source, so there is nothing to install or build.
      '@shared': path.resolve(import.meta.dirname, '../shared/src'),
    },
    /*
     * The same pin as `web/vite.config.ts`, and for the same reason — the long
     * explanation is there. `shared/` imports these by bare name and owns no
     * `node_modules`, so the production bundler would replace an absent optional
     * peer with an empty stub. This app happens to build without it today
     * because nothing it imports from `shared/` has reached a zod schema yet;
     * the first Zod form in the portal would break the build otherwise.
     *
     * Keep in step with `shared/package.json`'s `peerDependencies`.
     */
    dedupe: ['zod', 'axios', 'react-hook-form'],
  },
  build: {
    rollupOptions: {
      output: {
        /*
         * video.js is ~400KB and only the portal's lesson player needs it. Its
         * own chunk keeps it off every marketing page, where Core Web Vitals
         * decide whether the site ranks.
         */
        manualChunks(id) {
          if (id.includes('node_modules/video.js') || id.includes('node_modules/@videojs')) {
            return 'player';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    // 5183 is web/. A different port so both dev servers can run side by side.
    port: 5184,
    strictPort: true,
    // `shared/` sits outside this project root, and the dev server refuses to
    // read outside it by default — without this the alias resolves but 403s.
    fs: {
      allow: [path.resolve(import.meta.dirname, '..')],
    },
  },
});
