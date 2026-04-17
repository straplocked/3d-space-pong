import { defineConfig } from "vite";

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
  },
});
