# Server overview

`@3d-space-pong/server` is a Fastify HTTP server that provides the JSON API and serves the static web bundle. Runtime: Node 20+.

Source: [packages/server/src/](../../../packages/server/src/).

## Pages in this section

- [API reference](./api-reference.md) — every endpoint.
- [Database schema](./database-schema.md) — Drizzle tables.
- [Leaderboard queries](./leaderboard-queries.md) — the raw SQL behind `/api/leaderboard`.
- [Seed and migrations](./seed-and-migrations.md) — Hall of Shame seeder + Drizzle migrator.
- [Environment](./environment.md) — env vars and container layout.

## Entry point

The app is split across two files so tests can build a Fastify instance without also running migrations/seed/listen:

- [packages/server/src/app.ts](../../../packages/server/src/app.ts) exports `buildApp(opts?)`, which builds (but doesn't start) a Fastify instance: logging, CORS, all three route modules, and (unless `opts.serveWeb === false`) static web-bundle serving + SPA fallback. Tests pass `{ serveWeb: false }` to skip the web-bundle lookup.
- [packages/server/src/index.ts](../../../packages/server/src/index.ts) is the production entrypoint. In order:
  1. Run Drizzle migrations from `./db/migrations` if the folder exists on disk. Fatal if the migrations fail.
  2. Run `seedIfEmpty()` from [db/seed.ts](../../../packages/server/src/db/seed.ts) — populates the Hall of Shame on first boot. Non-fatal if it throws (logged and skipped).
  3. Call `buildApp()`.
  4. Listen on `${HOST}:${PORT}` (defaults `0.0.0.0:3000`).

Inside `buildApp()`:
1. Build a Fastify instance with pino logging (pino-pretty in dev, raw JSON in prod/test; silent by default in tests unless `LOG_LEVEL` is set).
2. Register CORS (`origin: true`, no credentials).
3. Register `/api/health` inline, then `signupRoutes`, `matchesRoutes`, `leaderboardRoutes`.
4. If a built web bundle exists at one of four candidate paths, register `@fastify/static` to serve it from `/` and install a `setNotFoundHandler` that returns `index.html` for any non-`/api/*` path (SPA fallback).

See [../testing.md](../testing.md) for how `buildApp()` is exercised in the test suite.

## Route modules

| File | Endpoints |
| --- | --- |
| [routes/signup.ts](../../../packages/server/src/routes/signup.ts) | `POST /api/signup` |
| [routes/matches.ts](../../../packages/server/src/routes/matches.ts) | `POST /api/matches` |
| [routes/leaderboard.ts](../../../packages/server/src/routes/leaderboard.ts) | `GET /api/leaderboard` |

All request bodies are validated via zod schemas from `@3d-space-pong/shared`. See [API reference](./api-reference.md).

## Database client

[db/client.ts](../../../packages/server/src/db/client.ts):
- Resolves `DB_URL` (strips `file:` prefix, resolves relative to CWD).
- Creates the parent directory if missing.
- Opens a `better-sqlite3` `Database` and sets pragmas: `journal_mode = WAL`, `foreign_keys = ON`.
- Exports `db` (Drizzle handle), `rawSqlite` (used by [leaderboard.ts](../../../packages/server/src/routes/leaderboard.ts) for raw parameterised SQL), and `schema`.

## Scripts

From [packages/server/package.json](../../../packages/server/package.json):

| Script | Command |
| --- | --- |
| `dev` | `tsx watch src/index.ts` |
| `build` | `tsc -p tsconfig.json && node scripts/copy-migrations.js` |
| `start` | `node dist/index.js` |
| `typecheck` | `tsc --noEmit` |
| `db:generate` | `drizzle-kit generate` |
| `db:migrate` | `tsx src/db/migrate.ts` |

`build` copies `src/db/migrations/*.sql` (and the Drizzle journal) into `dist/db/migrations` via [scripts/copy-migrations.js](../../../packages/server/scripts/copy-migrations.js) — `tsc` only emits compiled `.ts` → `.js` and drops everything else, so without this step a locally built server would start against a schemaless DB until someone ran `db:migrate` by hand. The dev server (`tsx watch src/index.ts`) reads migrations straight from `src/` and doesn't need this step. See [seed-and-migrations.md](./seed-and-migrations.md).
