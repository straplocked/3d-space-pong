import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    host: true, // bind 0.0.0.0 so other machines on the LAN can hit the dev URL
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    // The lazily-loaded engine chunk is essentially three.js + its
    // postprocessing addons (~518 kB); it can't usefully split further, and
    // it's off the critical path (see src/engine.ts).
    chunkSizeWarningLimit: 560,
  },
  plugins: [
    VitePWA({
      // Service worker is only emitted/registered in `vite build` output —
      // `devOptions.enabled` stays false (default), so `pnpm dev` never
      // registers a worker or serves stale cached assets while developing.
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifestFilename: "manifest.webmanifest",
      manifest: {
        id: ".",
        name: "3D Space Pong",
        short_name: "Space Pong",
        description: "A pong game that keeps receipts.",
        start_url: ".",
        scope: ".",
        display: "fullscreen",
        display_override: ["fullscreen", "standalone"],
        orientation: "landscape",
        categories: ["games", "entertainment"],
        lang: "en",
        // Dark neon palette — matches --bg-0 in styles.css and the
        // <meta name="theme-color"> in index.html, so there's no flash of
        // an unstyled color on the OS splash screen / task switcher.
        theme_color: "#000500",
        background_color: "#000500",
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the built app shell (hashed JS/CSS/HTML + icons) for
        // offline play of the local (non-AI) game modes.
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
        // Never let the SW answer for the API — always hit the network so
        // signup / match recording / leaderboard stay live data, and so a
        // stale cached response never masquerades as a real API reply.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkOnly",
          },
        ],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
