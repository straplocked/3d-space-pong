# Database schema

The database is a single SQLite file with two tables. Drizzle ORM defines the schema in TypeScript; the concrete SQL is in the migration file.

Sources:
- [packages/server/src/db/schema.ts](../../../packages/server/src/db/schema.ts) (Drizzle definitions — source of truth)
- [packages/server/src/db/migrations/0000_init.sql](../../../packages/server/src/db/migrations/0000_init.sql) (generated SQL)

## Tables

### `users`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK, autoincrement | |
| `display_name` | text NOT NULL | **Unique** — `users_display_name_unique`. Returned in `409` if taken on signup. |
| `email` | text NOT NULL | **Unique** — `users_email_unique`. Signup upserts by email. |
| `marketing_consent` | integer (bool) NOT NULL default 0 | |
| `created_at` | integer (unix epoch) NOT NULL default `(unixepoch())` | |

Drizzle field names (used in server code) are camelCase: `displayName`, `marketingConsent`, `createdAt`.

### `matches`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | integer PK, autoincrement | |
| `user_id` | integer NOT NULL | FK → `users.id` (`ON UPDATE no action, ON DELETE no action`). Indexed: `matches_user_id_idx`. |
| `difficulty` | text NOT NULL, enum `rookie\|amateur\|pro\|expert\|legend` | Indexed: `matches_difficulty_idx`. |
| `outcome` | text NOT NULL, enum `win\|loss` | Indexed: `matches_outcome_idx`. |
| `player_score` | integer NOT NULL | |
| `ai_score` | integer NOT NULL | |
| `duration_ms` | integer NOT NULL | Active play time only (pause time excluded, see [game-engine-overview](../web/game-engine-overview.md)). |
| `played_at` | integer (unix epoch) NOT NULL default `(unixepoch())` | |

Drizzle field names: `userId`, `playerScore`, `aiScore`, `durationMs`, `playedAt`.

## SQLite pragmas

Set in [db/client.ts](../../../packages/server/src/db/client.ts):

- `journal_mode = WAL` — write-ahead logging for better concurrency and crash safety. Produces `.db-wal` and `.db-shm` sidecar files next to the `.db`.
- `foreign_keys = ON` — SQLite defaults this OFF; we turn it on so the FK from `matches.user_id` to `users.id` is actually enforced.

## Inferred TypeScript types

Drizzle exports:
- `User` (`typeof users.$inferSelect`) — row returned from `SELECT`.
- `NewUser` (`typeof users.$inferInsert`) — input to `INSERT` (nullable fields and defaults become optional).
- `Match`, `NewMatch` — same pattern.

Used by [db/seed.ts](../../../packages/server/src/db/seed.ts) to build bulk inserts and by the route handlers as typed query results.

## Switching to Postgres (not yet wired)

The Drizzle schema layer is already abstracted enough that porting to `drizzle-orm/node-postgres` would be a matter of swapping [db/client.ts](../../../packages/server/src/db/client.ts) and regenerating migrations. The `LeaderboardQuerySchema` and route code should port unchanged, but the raw-SQL leaderboard query uses SQLite-style named parameters (`@difficulty`, `@limit`) that would need to become `$1, $2, ...` for Postgres — see [leaderboard queries](./leaderboard-queries.md).
