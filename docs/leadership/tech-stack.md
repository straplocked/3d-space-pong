# Tech stack

## At a glance

| Layer | What | Why |
| --- | --- | --- |
| Front-end rendering | **three.js** (WebGL) | Industry-standard browser 3D. Mature post-processing (`UnrealBloomPass`), fog, shadow maps. |
| Background parallax | **parallax.js** | Cheap, non-WebGL depth illusion layered behind the game canvas. Free visual complexity. |
| Front-end bundling | **Vite** | Fast dev loop, modern ESM, minimal config. |
| Front-end framework | None — **vanilla TypeScript** | No runtime framework needed. Interfaces are simple enough that template strings + addEventListener are less code than a framework. |
| Server | **Fastify** | Minimal Node HTTP server. Order-of-magnitude faster than Express for the same feature set. Good native logging (pino) and schema hooks. |
| Validation | **zod** (shared between client and server) | One schema defines the API contract and the form-validation on the client — no drift possible. |
| ORM | **Drizzle** | Type-safe SQL. Schema in TypeScript. Generates migrations from schema diffs. Portable across SQLite and Postgres without rewriting queries. |
| Database | **SQLite via `better-sqlite3`** | Single file. Zero ops. Fast enough for any realistic traffic this product would see. WAL journaling for concurrency and crash safety. |
| Package manager | **pnpm workspaces** | Monorepo support, symlinked workspace deps (`workspace:*`), fast installs. |
| Process orchestration | **Docker + tini** | Single container, proper signal handling (tini as PID 1 lets the Node process receive SIGTERM cleanly). |
| Container base | **node:20-alpine** | Small. The one native dependency (`better-sqlite3`) builds against Alpine's stdlib with python3/make/g++ in the build stage only. |

## Monorepo layout

```
packages/
  shared/   — zod schemas + types shared by both sides
  server/   — Fastify + Drizzle + SQLite
  web/      — Vite + three.js + parallax.js front-end
```

`shared` is built first; both `web` and `server` depend on it via `workspace:*`. One container ships both the built web bundle and the API — the server statically serves `web/dist` and falls back to `index.html` for non-API routes so the hash router works server-agnostically.

## Why the choices map to the business

- **SQLite instead of Postgres** — the product target is self-hosters with a handful of users. Postgres would add an operational tax (a separate container, a separate port, connection pooling) for zero user-visible benefit at this scale. The ORM layer keeps the Postgres door open if ever needed.
- **Vanilla TypeScript instead of React/Vue** — the UI is mostly static template strings. A framework would add ~50 KB of runtime, a build-time complexity tax, and no win. Render functions that return strings fit the problem.
- **zod in shared** — one definition validates a form and a request body. Removes a common class of front/back drift bugs at zero runtime cost on the server (zod parses once per request).
- **three.js with post-processing** — `UnrealBloomPass` + `FogExp2` + `AdditiveBlending` starfield sells the aesthetic (phosphor-on-black arcade in space) cheaply. Custom shaders would buy us little and cost a lot.
- **Drizzle** — we wrote one raw-SQL query for the leaderboard (aggregation with conditional `HAVING` clauses and `EXISTS` badge subqueries); Drizzle handles everything else. When we outgrow Drizzle's query builder, we fall back to raw SQL — no need for a second ORM.
- **Single container + bind-mount** — a user can `docker compose up` and be playing in under a minute. Backup is `cp -r data/ data.bak`.

## Runtime dependencies by package

(See `package.json` in each package for exact versions.)

**Server** (`packages/server`)
- `fastify`, `@fastify/cors`, `@fastify/static`
- `drizzle-orm`, `better-sqlite3`
- `zod`, `@3d-space-pong/shared`
- `dotenv`, `pino-pretty` (dev logging)

**Web** (`packages/web`)
- `three`
- `parallax-js`
- `zod`, `@3d-space-pong/shared`

**Shared** (`packages/shared`)
- `zod` only

## Build tooling

- `tsc` for the shared and server builds.
- `vite` for the web build.
- `drizzle-kit` for migration generation (`pnpm db:generate`).
- `tsx` for dev-mode server hot-reload (`pnpm dev`).
