import "dotenv/config";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

import { db } from "./db/client.js";
import { seedIfEmpty } from "./db/seed.js";
import { buildApp } from "./app.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  // Run migrations on startup so a fresh container (or a local `pnpm build`
  // + `pnpm start`) "just works" without a manual `db:migrate` step. The
  // server's `build` script copies `src/db/migrations` into `dist/db/migrations`
  // (see scripts/copy-migrations.js) so this folder exists next to the
  // compiled output both locally and in the Docker image.
  const migrationsFolder = resolve(__dirname, "./db/migrations");
  if (existsSync(migrationsFolder)) {
    try {
      migrate(db, { migrationsFolder });
    } catch (err) {
      console.error("Migration failed:", err);
      throw err;
    }
  }

  // Seed the Hall of Shame on first boot (no-op if it already has data).
  try {
    seedIfEmpty();
  } catch (err) {
    console.error("Seed failed (non-fatal):", err);
  }

  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
