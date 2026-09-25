import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Plan B International',
        short_name: 'Plan B',
        description: 'Your UAE migration companion',
        theme_color: '#0F1E45',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // Source-only package shared with mobile/ — see the root CLAUDE.md §2.
      // Vite compiles it from source, so there is nothing to install or build.
      '@shared': path.resolve(import.meta.dirname, '../shared/src'),
    },
    /*
     * `shared/` imports these three by bare name and has no `node_modules` of
     * its own — it declares them as OPTIONAL peer dependencies (root CLAUDE.md
     * §2). The dev server resolves them by walking up into this app's
     * `node_modules`; the production bundler does not walk, decides the optional
     * peer is simply absent, and substitutes an empty stub module. The build
     * then fails with `"z" is not exported by __vite-optional-peer-dep:zod`,
     * which names the stub rather than the cause.
     *
     * `dedupe` pins each one to this app's copy, which fixes the build and also
     * guarantees a single instance of zod — two copies produce schemas that fail
     * each other's `instanceof` checks in ways that are very hard to read.
     *
     * Keep this list in step with `shared/package.json`'s `peerDependencies`.
     */
    dedupe: ['zod', 'axios', 'react-hook-form'],
  },
  server: {
    port: 5183,
    strictPort: true,
    // `shared/` sits outside this project root, and the dev server refuses to
    // read outside it by default — without this the alias resolves but 403s.
    fs: {
      allow: [path.resolve(import.meta.dirname, '..')],
    },
  },
});
