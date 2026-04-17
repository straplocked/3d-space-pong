# CLAUDE.md

Project instructions for Claude Code working in this repo.

## Read the docs first

At the start of every new conversation where the user's question touches code, product behavior, or operational concerns, **read [docs/README.md](./docs/README.md)** as your first action. That index routes to three audience-specific sub-trees (`technical/`, `user/`, `leadership/`) with sub-ToCs. Follow the relevant branch only — don't read every file.

Skip the doc scan only for trivial single-file questions that the conversation explicitly scopes (e.g. "fix the typo on line 42 of README.md").

## Docs are canonical orientation; code is canonical truth

The docs describe how the codebase was at the last doc-update run. If you find a conflict between a doc and the current code, **trust the code** and update the doc on the next doc-update run (see below). Don't rewrite the code to match a stale doc.

Key source-of-truth pointers (linked from [docs/technical/architecture.md](./docs/technical/architecture.md)):

- AI difficulty profiles → [packages/web/src/game/AI.ts](./packages/web/src/game/AI.ts)
- Game physics constants → top of [packages/web/src/game/PongGame.ts](./packages/web/src/game/PongGame.ts)
- Database schema → [packages/server/src/db/schema.ts](./packages/server/src/db/schema.ts)
- API validation → [packages/shared/src/schemas.ts](./packages/shared/src/schemas.ts)
- Humor copy → [packages/web/src/content/quips.ts](./packages/web/src/content/quips.ts)
- Env vars / container → [.env.example](./.env.example), [Dockerfile](./Dockerfile)

## Updating documentation

The docs are maintained by running the "doc update" prompt repeatedly. The full spec lives in [DOC_UPDATE.md](./DOC_UPDATE.md) — read it before touching anything under `docs/`.

Summary of the re-run protocol:

1. Re-scan the code.
2. Update any doc page that has drifted.
3. If a source file has crossed ~300 lines since last time, split its doc per the split-file rule.
4. Bump `Run count` and set `Last run: YYYY-MM-DD` in [DOC_UPDATE.md](./DOC_UPDATE.md).
5. Append a dated entry to [docs/CHANGELOG.md](./docs/CHANGELOG.md) describing what changed.

**Never** write change narrative into `DOC_UPDATE.md` itself. The only diff there per run is the counter bump.

## Project shape (so you don't have to grep)

pnpm monorepo. Three packages:

- `packages/shared` — zod schemas + types shared between web and server.
- `packages/server` — Fastify + Drizzle ORM + SQLite. Serves `/api/*` and the built web bundle.
- `packages/web` — Vite + three.js + parallax.js front-end. Hash router, vanilla DOM UI.

Deployed as a single Docker container with a bind-mounted SQLite file at `/app/data/pong.db`. See [docs/leadership/architecture-at-a-glance.md](./docs/leadership/architecture-at-a-glance.md).

## Coding norms

- TypeScript everywhere. Strict mode assumed.
- No frameworks on the front end — UI is template strings into `#app` or `document.body`. Don't introduce React/Vue/Svelte etc. without a strong reason.
- zod is the validation layer for any HTTP boundary. Add to [packages/shared/src/schemas.ts](./packages/shared/src/schemas.ts) before touching a route.
- Drizzle is preferred over raw SQL; raw SQL is acceptable for aggregations the query builder can't express cleanly (example: [packages/server/src/routes/leaderboard.ts](./packages/server/src/routes/leaderboard.ts)).
- Humor only in flavor copy (quips.ts), never in error messages. Rule lives at the top of [quips.ts](./packages/web/src/content/quips.ts).

## Where to start for common tasks

| Task | Start here |
| --- | --- |
| Add a new game feature | [docs/technical/web/game-engine-overview.md](./docs/technical/web/game-engine-overview.md) |
| Tune graphics | [docs/technical/web/devpanel-overview.md](./docs/technical/web/devpanel-overview.md) |
| Add/modify an API endpoint | [docs/technical/server/api-reference.md](./docs/technical/server/api-reference.md) |
| Change the schema | [docs/technical/server/database-schema.md](./docs/technical/server/database-schema.md) + [seed-and-migrations.md](./docs/technical/server/seed-and-migrations.md) |
| Add a new UI screen | [docs/technical/web/ui-screens.md](./docs/technical/web/ui-screens.md) + [router-lifecycle.md](./docs/technical/web/router-lifecycle.md) |
| Add jokes | [docs/technical/web/content-quips.md](./docs/technical/web/content-quips.md) |
| Change deployment | [docs/technical/server/environment.md](./docs/technical/server/environment.md) + [docs/user/self-hosting.md](./docs/user/self-hosting.md) |
