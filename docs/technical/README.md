# Technical documentation

For developers reading or changing the code.

## Start here

- **[Architecture overview](./architecture.md)** — monorepo layout, data flow, build graph, runtime topology.

## By package

### Shared (`packages/shared`)
- [Schemas reference](./shared/schemas-reference.md) — zod schemas and inferred types shared between client and server.

### Server (`packages/server`)
- [Server overview](./server/README.md) — entry point, startup order, routes, DB client.
- [API reference](./server/api-reference.md) — `/api/health`, `/api/signup`, `/api/matches`, `/api/leaderboard`.
- [Database schema](./server/database-schema.md) — Drizzle `users` + `matches` tables.
- [Leaderboard queries](./server/leaderboard-queries.md) — raw SQL, the five sort modes, badge computation.
- [Seed and migrations](./server/seed-and-migrations.md) — Hall of Shame seeder + Drizzle migrator.
- [Environment](./server/environment.md) — env vars, Docker stages, data directory.

### Web (`packages/web`)
- [Web overview](./web/README.md) — router, lifecycle, game engine, UI screens.
- **Game engine** (split across multiple pages because the source is large):
  - [Game engine overview](./web/game-engine-overview.md) — start here. Entry points, lifecycle, file map.
  - [Scene, lighting, bloom](./web/game-engine-scene.md)
  - [Physics and scoring](./web/game-engine-physics.md)
  - [Starfield, dust, particles](./web/game-engine-fx.md)
- [AI difficulty and controller](./web/ai.md)
- [Input (keyboard + touch)](./web/input.md)
- [Router and lifecycle](./web/router-lifecycle.md)
- **Dev panel** (split):
  - [Dev panel overview](./web/devpanel-overview.md)
  - [Dev panel controls](./web/devpanel-controls.md)
  - [Dev panel persistence](./web/devpanel-persistence.md)
- [UI screens](./web/ui-screens.md) — menu, signup, leaderboard, game-over, pause, HUD, idle, orientation guard, install button / offline pill, engine error, wake lock, attract.
- [Content / quips](./web/content-quips.md)
- [Audio (Web Audio SFX)](./web/audio.md)
