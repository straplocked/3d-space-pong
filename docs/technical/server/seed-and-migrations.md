# Seed and migrations

Two separate bootstrap steps run at server startup, in this order: **migrate**, then **seed**.

## Migrations

Source: [packages/server/src/db/migrate.ts](../../../packages/server/src/db/migrate.ts) (standalone runner) and the inline `migrate(...)` call in [index.ts](../../../packages/server/src/index.ts).

- Migrations live in `packages/server/src/db/migrations/` as numbered SQL files (`0000_init.sql`, ...) with a `meta/` folder that Drizzle uses as a journal.
- On server startup, [index.ts](../../../packages/server/src/index.ts) calls `migrate(db, { migrationsFolder })` from `drizzle-orm/better-sqlite3/migrator`, resolving the folder at `dist/db/migrations` (relative to the compiled `index.js`). Drizzle consults its journal and only applies new migrations.
- If the folder doesn't exist at the resolved path, migration is skipped with no error — so it's important that the folder always ends up next to the compiled output. The server's `build` script (`tsc -p tsconfig.json && node scripts/copy-migrations.js`) makes sure of this: `tsc` only emits compiled `.ts` → `.js` and silently drops the non-TS `.sql`/`.json` files, so [scripts/copy-migrations.js](../../../packages/server/scripts/copy-migrations.js) copies `src/db/migrations` → `dist/db/migrations` as the second half of the build. This runs for a plain local `pnpm build` and inside the Docker build stage alike, so the Dockerfile no longer needs its own explicit copy step (see [environment](./environment.md)) — a locally built server now migrates on first boot without a manual `pnpm db:migrate`.
- If migrations fail, the server **fails to start** (fatal).

### Generating a new migration

After editing [db/schema.ts](../../../packages/server/src/db/schema.ts):

```bash
pnpm db:generate
```

This runs `drizzle-kit generate` per [drizzle.config.ts](../../../packages/server/drizzle.config.ts). Drizzle diffs the schema against its journal and writes a new `000N_*.sql`.

### Manual migration runner

```bash
pnpm db:migrate
```

Runs [db/migrate.ts](../../../packages/server/src/db/migrate.ts) standalone. Useful for applying migrations outside the server process (e.g. after an out-of-band schema change). Not required in normal operation — the server migrates on boot.

## Seeding the Hall of Shame

Source: [packages/server/src/db/seed.ts](../../../packages/server/src/db/seed.ts).

The app needs a populated leaderboard on first boot so attract mode has something to show before any real humans play. The seeder produces a fictional cast of ~27 losers (`CAST` array), each with a curated record of losses, optional wins, optional Rookie losses, and optional Legend wins.

### Invocation

Called by [index.ts](../../../packages/server/src/index.ts) as `seedIfEmpty()` after migrations run. Non-fatal: an error here logs `Seed failed (non-fatal):` and the server continues.

### Idempotency

The seeder opens with:

```ts
const existing = /* SELECT count(*) FROM matches */;
if (existing > 0) return;
```

So it is safe to run on every boot. The first run populates the table, subsequent runs no-op.

### What it generates, per seed user

From `buildMatches()`:
- `rookieLosses` forced Rookie losses (earns the 🙈 ROOKIE VICTIM badge).
- One extra-fast loss at `fastestLossMs` if specified (populates "fastest L" stat).
- Remaining losses spread across weighted difficulties via `pickDifficulty()` (weights lean toward `pro`).
- `legendWins` forced Legend wins (earns the 👑 LEGEND SLAYER badge).
- Remaining wins against non-legend difficulties.
- `playedAt` is randomised over a 45-day window so the scatter looks natural.

### Adding fictional entries

Append to the `CAST` array in [seed.ts](../../../packages/server/src/db/seed.ts). To see new entries in an existing DB, delete or empty the `matches` table first — the idempotency check keys off match count, not cast size.

### Dropping the DB to re-seed

```bash
rm packages/server/data/pong.db*
```

Removes the `.db` and its `.db-wal`/`.db-shm` sidecars. Next server start will migrate fresh and re-seed.
