# Documentation

Entry point for all project documentation. Organised by audience — start wherever matches what you came here to do.

## Three audiences

- **[Technical](./technical/README.md)** — developers reading or changing the code. Architecture, API reference, game-engine walkthroughs, database schema.
- **[User](./user/README.md)** — players and self-hosters. How to play, controls, modes, running it on your own server.
- **[Leadership](./leadership/README.md)** — stakeholders and decision-makers. One-page summary, tech stack rationale, operational footprint.

## How this documentation is maintained

- **[../DOC_UPDATE.md](../DOC_UPDATE.md)** is the maintenance spec (folder layout, split rules, re-run protocol, run counter).
- **[CHANGELOG.md](./CHANGELOG.md)** records what changed in each doc-update run (dated entries).
- Whenever these docs are refreshed from the codebase, follow `DOC_UPDATE.md`. Never write change entries into `DOC_UPDATE.md` itself — only the run counter is updated there.

## Split-file convention

Some subsystems (the 3D game engine, the dev panel) are large enough that their docs are split across multiple files. In those cases, an **overview** page acts as a table of contents that links to sub-pages — start there and jump into the section you need.

## Quick map of the codebase

| Area | Source | Start here |
| --- | --- | --- |
| 3D game engine | [packages/web/src/game/](../packages/web/src/game/) | [Game engine overview](./technical/web/game-engine-overview.md) |
| AI difficulty | [packages/web/src/game/AI.ts](../packages/web/src/game/AI.ts) | [AI](./technical/web/ai.md) |
| UI screens | [packages/web/src/ui/](../packages/web/src/ui/) | [UI screens](./technical/web/ui-screens.md) |
| API routes | [packages/server/src/routes/](../packages/server/src/routes/) | [API reference](./technical/server/api-reference.md) |
| Database | [packages/server/src/db/](../packages/server/src/db/) | [Database schema](./technical/server/database-schema.md) |
| Shared types | [packages/shared/src/](../packages/shared/src/) | [Schemas reference](./technical/shared/schemas-reference.md) |
| Humor copy | [packages/web/src/content/quips.ts](../packages/web/src/content/quips.ts) | [Content / quips](./technical/web/content-quips.md) |
| Automated tests | [packages/*/test/](../packages/) | [Testing](./technical/testing.md) |
