# Leaderboard queries

The leaderboard endpoint is built on a single parameterised raw SQL query against [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), not Drizzle's query builder. The query aggregates per user, attaches badges via `EXISTS` subqueries, and composes different `HAVING` / `ORDER BY` clauses per sort mode.

Source: [packages/server/src/routes/leaderboard.ts](../../../packages/server/src/routes/leaderboard.ts).

## Base aggregation

```sql
SELECT
  u.id                                                   AS userId,
  u.display_name                                         AS displayName,
  SUM(CASE WHEN m.outcome = 'win'  THEN 1 ELSE 0 END)    AS wins,
  SUM(CASE WHEN m.outcome = 'loss' THEN 1 ELSE 0 END)    AS losses,
  COUNT(m.id)                                            AS totalGames,
  MIN(CASE WHEN m.outcome = 'loss' THEN m.duration_ms END) AS shortestLossMs,
  EXISTS (
    SELECT 1 FROM matches mr
    WHERE mr.user_id = u.id
      AND mr.difficulty = 'rookie'
      AND mr.outcome = 'loss'
  )                                                      AS lostToRookie,
  EXISTS (
    SELECT 1 FROM matches ml
    WHERE ml.user_id = u.id
      AND ml.difficulty = 'legend'
      AND ml.outcome = 'win'
  )                                                      AS beatLegend
FROM users u
INNER JOIN matches m ON m.user_id = u.id
WHERE 1=1 {difficultyFilter}
GROUP BY u.id, u.display_name
```

Notes:
- `INNER JOIN` means users with zero recorded matches never appear on the leaderboard.
- `{difficultyFilter}` is either empty or `AND m.difficulty = @difficulty` — the value itself is bound as a named parameter, not string-interpolated.
- Badges (`lostToRookie`, `beatLegend`) come from `EXISTS` against the **unfiltered** `matches` table. A player's Rookie-Victim badge is accurate even when the leaderboard is filtered to, say, `difficulty=legend`.

## Per-sort clauses

From the `switch (sort)` block:

| `sort` | `HAVING` | `ORDER BY` |
| --- | --- | --- |
| `wins` | — | `wins DESC, losses ASC, totalGames DESC` |
| `losses` | — | `losses DESC, wins ASC, totalGames DESC` |
| `ratio` | `totalGames >= 5` | `(CAST(wins AS REAL) / NULLIF(losses, 0)) DESC NULLS LAST, wins DESC` |
| `shortest_loss` | `shortestLossMs IS NOT NULL` | `shortestLossMs ASC` |
| `rookie_victims` | `lostToRookie = 1` | `losses DESC, wins ASC` |

The final query is `${baseSelect} ${havingClause} ${orderClause} LIMIT @limit`.

## Result mapping

`RawRow` → `LeaderboardRow` happens in `rowToLeaderboard()`:

- **Ratio** is not stored by the aggregation; it's computed from `wins/losses` in JS:
  - `losses === 0 && wins > 0` → `ratio = wins` (undefeated player with at least one win; sort key handles these via `NULLIF`).
  - `losses === 0 && wins === 0` → `ratio = null`.
  - Otherwise → `Number((wins/losses).toFixed(2))`.
- `lostToRookie` and `beatLegend` are converted from SQLite's `0/1` integer to JS booleans.

## Parameter binding

The query uses named parameters (SQLite's `@name` syntax, passed as an object):
```ts
const params: Record<string, unknown> = { limit };
if (difficulty) params.difficulty = difficulty;
const rows = stmt.all(params) as RawRow[];
```

`sort` is **not** a parameter — it's used to compose the clauses themselves. Because `sort` is zod-validated against a fixed enum in [schemas.ts](../../../packages/shared/src/schemas.ts), there is no SQL-injection surface.

## Adding a new sort mode

1. Add the string to the `.enum([...])` in `LeaderboardQuerySchema` ([packages/shared/src/schemas.ts](../../../packages/shared/src/schemas.ts)).
2. Add the string to the `LeaderboardSort` type alias in [packages/shared/src/types.ts](../../../packages/shared/src/types.ts).
3. Add a `case` in the `switch (sort)` block setting `orderClause` (and optionally `havingClause`).
4. If the sort needs a new aggregated field, extend the `SELECT` in `baseSelect`, the `RawRow` interface, and `rowToLeaderboard()`.

The web client's [api.ts](../../../packages/web/src/api.ts) needs no change — it takes `LeaderboardSort` directly from shared.
