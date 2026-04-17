# Architecture overview

A pnpm workspace with three packages. One container serves both the static web bundle and the JSON API from a single port.

## Monorepo layout

```
3d-space-pong/
├── packages/
│   ├── shared/   # zod schemas + types shared by client and server
│   ├── server/   # Fastify API + Drizzle ORM + SQLite migrations + seed
│   └── web/      # Vite + three.js + parallax.js front-end
├── Dockerfile
├── docker-compose.yml
├── package.json          # workspace root
└── pnpm-workspace.yaml
```

Workspace package name prefix: `@3d-space-pong/*`. The web and server packages depend on `@3d-space-pong/shared` via `workspace:*`.

## Runtime topology

```
┌───────────────┐        HTTP/JSON         ┌───────────────────────────────┐
│ Browser       │ ───────────────────────▶ │  Fastify (packages/server)    │
│ (three.js)    │                          │  :3000                        │
│ static bundle │ ◀─── static /*  ──────── │  ├─ /api/*  (JSON)            │
└───────────────┘                          │  └─ /*      (serves web/dist) │
                                           └──────────────┬────────────────┘
                                                          │ better-sqlite3
                                                          ▼
                                              SQLite file at $DB_URL
                                              (bind-mount /app/data/pong.db)
```

The server has two responsibilities: serve the built web bundle and serve `/api/*`. A single-page-app fallback in [packages/server/src/index.ts](../../packages/server/src/index.ts) returns `index.html` for any non-API route so the hash router can take over.

## Data flow for a single match

1. Player opens the site → Vite/Fastify serves `web/dist/index.html`.
2. `main.ts` boots router, registers routes, starts idle watcher. Default hash is `/attract` (first-time) or the user's last hash.
3. User signs up → `POST /api/signup` upserts a row in `users`, response stored in `localStorage` via `state.ts`.
4. User picks a difficulty → hash becomes `/game?mode=ai&difficulty=pro`. `main.ts` constructs a `PongGame` and binds the HUD, pause overlay, and (on mobile) rotate prompt + fullscreen.
5. Game loop runs in `PongGame.tick()`. Score changes bubble up via `onScoreChange` → HUD updates.
6. When a side reaches 7 points, `start()`'s promise resolves with a `GameResult`. If the mode is AI and not aborted, `api.recordMatch()` posts to `POST /api/matches`.
7. `gameOver.ts` renders results + a context-aware quip.

## Shared types / schemas flow

```
packages/shared/src/schemas.ts  (zod)
  │
  ├─ imported by packages/server/src/routes/*.ts → validates request bodies
  ├─ imported by packages/web/src/ui/signup.ts   → validates form input
  └─ imported by packages/web/src/api.ts         → types the fetch client
```

The `DIFFICULTIES` tuple in [packages/shared/src/types.ts](../../packages/shared/src/types.ts) is the single source of truth for valid difficulty names — the Drizzle schema, zod enums, and AI profiles all depend on it.

## Build graph

| Order | Command | Produces |
| --- | --- | --- |
| 1 | `pnpm --filter @3d-space-pong/shared run build` | `packages/shared/dist/` (tsc) |
| 2 | `pnpm --filter @3d-space-pong/web run build` | `packages/web/dist/` (vite) |
| 3 | `pnpm --filter @3d-space-pong/server run build` | `packages/server/dist/` (tsc) |

`pnpm dev` is a different story: shared is built once, then web (`vite`) and server (`tsx watch`) run in parallel.

## Dev mode vs production

| | Dev | Production |
| --- | --- | --- |
| Web bundle | Vite dev server on `:5173` with `/api` proxy to `:3000` | Built and served by Fastify from `packages/web/dist/` |
| Server | `tsx watch src/index.ts` | `node dist/index.js` |
| DB | SQLite file at `packages/server/data/pong.db` (created on first run) | SQLite file at `/app/data/pong.db` (bind mount) |
| Logs | `pino-pretty` | Raw pino JSON |

See [packages/web/vite.config.ts](../../packages/web/vite.config.ts) for proxy config.

## Container

Multi-stage build in [Dockerfile](../../Dockerfile):
1. `base` — `node:20-alpine` + pnpm 9 + build toolchain (python3 / make / g++ for `better-sqlite3` native build).
2. `deps` — installs workspace deps with cached layer.
3. `build` — runs `pnpm --filter ... run build` for shared → web → server in order.
4. `runtime` — slim `node:20-alpine`, installs **only** `@3d-space-pong/server`'s production deps, copies `packages/{shared,server,web}/dist`, exposes `:3000`, healthchecks `/api/health`, entrypoint is `tini` then `node dist/index.js`.

One container, one bind mount (`/app/data`), one port (`3000`). Details in [environment](./server/environment.md).

## Source of truth pointers

When updating docs, the code authoritatively answers most questions. Common destinations:

- AI difficulty profiles → [packages/web/src/game/AI.ts](../../packages/web/src/game/AI.ts)
- Game physics constants → [packages/web/src/game/PongGame.ts](../../packages/web/src/game/PongGame.ts) (top of file)
- DB schema → [packages/server/src/db/schema.ts](../../packages/server/src/db/schema.ts)
- Zod validation → [packages/shared/src/schemas.ts](../../packages/shared/src/schemas.ts)
- Humor copy → [packages/web/src/content/quips.ts](../../packages/web/src/content/quips.ts)
- Env vars → [.env.example](../../.env.example) and [Dockerfile](../../Dockerfile)
