// Copies the Drizzle SQL migration files (and their journal metadata) into
// dist/ after `tsc` runs. tsc only emits compiled .ts -> .js; it silently
// drops non-TS files like *.sql and meta/_journal.json. Without this step,
// `pnpm build` produces a dist/ that boots but has no migrations folder, so
// `index.ts`'s `existsSync(migrationsFolder)` check fails and the server
// starts against a schemaless DB until someone runs `db:migrate` by hand.
//
// Run as part of the server's `build` script (see package.json), so both a
// local `pnpm build` and the Docker build stage get a complete dist/.
import { cpSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = resolve(__dirname, "../src/db/migrations");
const dest = resolve(__dirname, "../dist/db/migrations");

if (!existsSync(src)) {
  console.error(`[copy-migrations] source folder not found: ${src}`);
  process.exit(1);
}

cpSync(src, dest, { recursive: true });
console.log(`[copy-migrations] copied ${src} -> ${dest}`);
