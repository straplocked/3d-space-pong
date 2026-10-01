import { defineConfig, devices } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Browser (WebGL, orientation, fullscreen, wake lock, visibility) behavior
// that Vitest + jsdom cannot exercise. Runs against a real BUILD of the
// server (packages/server/dist, serving packages/web/dist), not the Vite
// dev server, so it covers what actually ships. Run `pnpm build` first.
//
// Each test run gets its own temp SQLite file so the leaderboard/Hall of
// Fame-and-Shame tests see predictable, isolated data.
const dbFile = join(mkdtempSync(join(tmpdir(), "pong-e2e-")), "pong.db");

const PORT = 3713;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // all specs share one server + one sqlite file
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    // Headless Chromium's default ("new" headless) GPU path doesn't give
    // us a real WebGL context. SwiftShader (software GL) does, but newer
    // Chromium builds gate it behind --enable-unsafe-swiftshader.
    launchOptions: {
      args: [
        "--use-gl=swiftshader",
        "--enable-unsafe-swiftshader",
        "--ignore-gpu-blocklist",
        "--disable-gpu-sandbox",
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node packages/server/dist/index.js",
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: String(PORT),
      HOST: "127.0.0.1",
      DB_URL: `file:${dbFile}`,
      DB_DRIVER: "sqlite",
      NODE_ENV: "production",
      LOG_LEVEL: "silent",
    },
  },
});
