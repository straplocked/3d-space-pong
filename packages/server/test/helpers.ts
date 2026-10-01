import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Spins up a Fastify instance (via buildApp) against a brand-new, throwaway
 * SQLite file with migrations already applied — mirroring what happens on a
 * real server boot (see src/index.ts), minus the seed step so tests control
 * their own fixture data.
 *
 * Must run before any other module in this test file imports `../src/db/client.js`
 * (directly or transitively), since that module resolves `DB_URL` once at
 * import time. Vitest gives each test file its own module registry, so a
 * dynamic import here — after setting the env var — is the first and only
 * time that module loads for this file.
 */
export async function setUpTestApp(): Promise<{
  app: FastifyInstance;
  cleanup: () => Promise<void>;
}> {
  const dir = mkdtempSync(join(tmpdir(), "3d-space-pong-test-"));
  const dbFile = join(dir, "test.db");
  process.env.DB_URL = `file:${dbFile}`;
  process.env.NODE_ENV = "test";

  const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
  const { db, rawSqlite } = await import("../src/db/client.js");

  const migrationsFolder = resolve(__dirname, "../src/db/migrations");
  migrate(db, { migrationsFolder });

  const { buildApp } = await import("../src/app.js");
  const app = await buildApp({ serveWeb: false });

  const cleanup = async () => {
    await app.close();
    rawSqlite.close();
    rmSync(dir, { recursive: true, force: true });
  };

  return { app, cleanup };
}
