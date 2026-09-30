# Architecture at a glance

```
  ┌──────────────────────┐         HTTP           ┌────────────────────────────┐
  │  Browser             │ ─────── JSON ────────▶ │  Fastify (Node 20)         │
  │  three.js + DOM UI   │                        │  :3000                     │
  │  • game canvas       │ ◀──── static /* ────── │  ├─ /api/*  (4 endpoints)  │
  │  • parallax bg       │                        │  └─ /*   (web/dist + SPA)  │
  │  • hash router       │                        └───────────┬────────────────┘
  └──────────────────────┘                                    │ better-sqlite3
                                                              ▼
                                                  ┌────────────────────────┐
                                                  │ SQLite file            │
                                                  │ /app/data/pong.db      │
                                                  │ WAL journaling         │
                                                  └────────────────────────┘
```

## Five bullets

1. **One container.** One port (`3000`). One bind mount (`./data → /app/data`). `docker compose up` and it's running.
2. **Four API endpoints**, all zod-validated: `GET /api/health`, `POST /api/signup`, `POST /api/matches`, `GET /api/leaderboard`.
3. **Two DB tables**: `users`, `matches`. Matches reference users by foreign key. Indexes on `user_id`, `difficulty`, `outcome`.
4. **Pre-seeded leaderboard.** On first boot, a fictional cast of ~27 losers populates the `matches` table so the Hall of Shame isn't empty on day one. Idempotent — runs only when the table is empty.
5. **Client-side state** is a single `localStorage` entry with `{ userId, displayName }`. No cookies, no session server, no auth tokens. Signup upserts by email; repeat sign-ins just re-establish the local cache.

## Data flow for a single match (the hot path)

1. Web client requests `/game?mode=ai&difficulty=pro`.
2. Client-side: lifecycle orchestrator loads the three.js engine chunk (lazy — prefetched in the background after the menu paints, keeping the initial download ~104 kB), constructs a `PongGame`, wires the HUD + pause + fullscreen (+ wake lock and auto-pause on mobile), and awaits the match promise.
3. Player plays until a side reaches 7 points (or quits, which discards the match).
4. Client `POST /api/matches { userId, difficulty, outcome, playerScore, aiScore, durationMs }`.
5. Server validates, verifies user exists, inserts row.
6. On next `/api/leaderboard` hit, the new row is visible.

## What's deliberately **not** in the diagram

- No external services. No CDN. No WebSocket server.
- No background jobs. The seeder runs inline on startup and no-ops on subsequent boots.
- No auth service. Email is the unique key; `localStorage` carries the session.

## Related technical docs

- Full architecture write-up: [../technical/architecture.md](../technical/architecture.md)
- API: [../technical/server/api-reference.md](../technical/server/api-reference.md)
- Schema: [../technical/server/database-schema.md](../technical/server/database-schema.md)
- Container layout: [../technical/server/environment.md](../technical/server/environment.md)
