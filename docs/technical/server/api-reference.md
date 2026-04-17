# API reference

Base path: `/api`. All bodies are JSON. All validation is zod — see [schemas reference](../shared/schemas-reference.md).

## `GET /api/health`

Defined inline in [packages/server/src/index.ts](../../../packages/server/src/index.ts).

**Response 200**:
```json
{ "status": "ok", "vibes": "immaculate" }
```

Also used as the container healthcheck (`wget -qO- http://localhost:3000/api/health`).

## `POST /api/signup`

Source: [packages/server/src/routes/signup.ts](../../../packages/server/src/routes/signup.ts).

Upsert-by-email. If a user exists with the given email, the row's `displayName` and `marketingConsent` are updated and its existing `id` is returned. Otherwise a new row is inserted.

**Body** (validated by `SignUpSchema`):
```json
{
  "displayName": "string (2–32 chars, letters/digits/space/dot/dash/underscore)",
  "email":       "string (valid email)",
  "marketingConsent": false
}
```

**Responses**:
| Status | Body | When |
| --- | --- | --- |
| 200 | `{ "userId": number, "displayName": string }` | Success (insert or update). |
| 400 | `{ "error": "Invalid sign-up data", "details": <zod flatten> }` | Validation failed. |
| 409 | `{ "error": "That display name is taken. Try another." }` | Unique constraint on `display_name`. |
| 500 | `{ "error": "Failed to create user" }` | Insert returned no row. |

The client stores `{ userId, displayName }` in `localStorage` under key `3d-space-pong:user` — see [state.ts](../../../packages/web/src/state.ts).

## `POST /api/matches`

Source: [packages/server/src/routes/matches.ts](../../../packages/server/src/routes/matches.ts).

**Body** (validated by `MatchResultSchema`):
```json
{
  "userId": 1,
  "difficulty": "rookie|amateur|pro|expert|legend",
  "outcome": "win|loss",
  "playerScore": 0,  // 0..50 int
  "aiScore": 0,      // 0..50 int
  "durationMs": 0    // non-negative int
}
```

**Responses**:
| Status | Body | When |
| --- | --- | --- |
| 200 | `{ "matchId": number \| null }` | Inserted (null only on edge case where `.returning().get()` is empty). |
| 400 | `{ "error": "Invalid match result", "details": <zod flatten> }` | Validation failed. |
| 404 | `{ "error": "User not found" }` | `userId` has no matching row. |

The client posts this from [main.ts](../../../packages/web/src/main.ts) after a non-aborted AI match. 2P matches are **not** recorded.

## `GET /api/leaderboard`

Source: [packages/server/src/routes/leaderboard.ts](../../../packages/server/src/routes/leaderboard.ts). See [leaderboard queries](./leaderboard-queries.md) for the full SQL breakdown.

**Querystring** (validated by `LeaderboardQuerySchema`):
| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `sort` | `"wins" \| "losses" \| "ratio" \| "shortest_loss" \| "rookie_victims"` | `"wins"` | See sort modes below. |
| `difficulty` | `Difficulty` | *(all)* | If set, only aggregates matches at that difficulty. Badges are computed from the unfiltered table regardless. |
| `limit` | int 1..100 | `20` | Coerced from string. |

### Sort modes

| `sort` value | Meaning | `HAVING` filter |
| --- | --- | --- |
| `wins` | Most wins first (tie-break: fewer losses, more games). | — |
| `losses` | **Hall of Shame default.** Most losses first. | — |
| `ratio` | Best wins/losses ratio. | `totalGames >= 5` (avoids one-game flukes). |
| `shortest_loss` | Fastest loss ascending. | `shortestLossMs IS NOT NULL`. |
| `rookie_victims` | Players who've lost at least one Rookie match. | `lostToRookie = 1`. |

### Response 200

```json
{
  "sort": "losses",
  "difficulty": null,
  "leaderboard": [
    {
      "userId": 1,
      "displayName": "keyboard_warrior",
      "wins": 3,
      "losses": 42,
      "totalGames": 45,
      "ratio": 0.07,
      "shortestLossMs": 12400,
      "lostToRookie": true,
      "beatLegend": false
    }
  ]
}
```

See [`LeaderboardRow`](../shared/schemas-reference.md#leaderboardrow-shape) for field semantics.

## `GET /*` (SPA fallback)

Any non-`/api/*` path returns `packages/web/dist/index.html` if the web bundle is present. API 404s return `{ "error": "Not found" }` with status 404. Logic lives at the bottom of [index.ts](../../../packages/server/src/index.ts).
