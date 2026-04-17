# Shared: schemas reference

The `@3d-space-pong/shared` package exports zod schemas and inferred types that both the client and the server import. It is the validation boundary between them.

Source: [packages/shared/src/schemas.ts](../../../packages/shared/src/schemas.ts), [packages/shared/src/types.ts](../../../packages/shared/src/types.ts).

## Tuples and enums

From [types.ts](../../../packages/shared/src/types.ts):

- `DIFFICULTIES` → `["rookie", "amateur", "pro", "expert", "legend"]` (const tuple).
- `OUTCOMES` → `["win", "loss"]` (const tuple).
- `Difficulty` = `(typeof DIFFICULTIES)[number]`.
- `Outcome` = `(typeof OUTCOMES)[number]`.
- `LeaderboardSort` = `"wins" | "losses" | "ratio" | "shortest_loss" | "rookie_victims"`.

These tuples are the single source of truth for valid difficulty names. The Drizzle schema ([packages/server/src/db/schema.ts](../../../packages/server/src/db/schema.ts)) and the AI profiles ([packages/web/src/game/AI.ts](../../../packages/web/src/game/AI.ts)) both key off the same strings — keep them in sync if the enum ever changes.

## Schemas

| Schema | Used by | Purpose |
| --- | --- | --- |
| `SignUpSchema` | `POST /api/signup` body; `renderSignup` form | Validates `displayName`, `email`, `marketingConsent`. |
| `SignUpResponseSchema` | `POST /api/signup` response | Documents `{ userId, displayName }`. |
| `MatchResultSchema` | `POST /api/matches` body | Validates a submitted match result. |
| `LeaderboardQuerySchema` | `GET /api/leaderboard` querystring | Coerces and defaults `sort`, `difficulty`, `limit`. |
| `DifficultySchema` | Enum field in other schemas | `z.enum(DIFFICULTIES)`. |
| `OutcomeSchema` | Enum field in other schemas | `z.enum(OUTCOMES)`. |

## Field rules that matter

From [schemas.ts](../../../packages/shared/src/schemas.ts):

### `SignUpSchema`
- `displayName` — trimmed, 2–32 chars, `/^[a-zA-Z0-9_\-\s.]+$/`. Error messages are player-facing (see the signup form).
- `email` — trimmed, lowercased, `.email()`.
- `marketingConsent` — boolean, defaults to `false`.

### `MatchResultSchema`
- `userId` — positive int.
- `difficulty` — `DifficultySchema`.
- `outcome` — `OutcomeSchema`.
- `playerScore` / `aiScore` — int, 0–50.
- `durationMs` — int ≥ 0.

### `LeaderboardQuerySchema`
- `sort` — one of `wins | losses | ratio | shortest_loss | rookie_victims` (defaults to `wins`).
- `difficulty` — optional `Difficulty`. If set, filters the aggregation to matches at that difficulty.
- `limit` — coerced to int, 1–100, defaults to 20.

## `LeaderboardRow` shape

Defined in [types.ts](../../../packages/shared/src/types.ts). Returned by the server, consumed by the attract mode and leaderboard screen:

```ts
interface LeaderboardRow {
  userId: number;
  displayName: string;
  wins: number;
  losses: number;
  totalGames: number;
  ratio: number | null;          // wins/losses, rounded to 2dp; null if losses=0 and wins=0
  shortestLossMs: number | null; // null if never lost
  lostToRookie: boolean;         // has at least one rookie loss
  beatLegend: boolean;           // has at least one legend win
}
```

See the [leaderboard queries](../server/leaderboard-queries.md) doc for how these fields are computed on the server.
