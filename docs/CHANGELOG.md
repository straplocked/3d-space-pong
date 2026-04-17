# Documentation Changelog

Dated log of documentation changes, one entry per DOC_UPDATE run. See [../DOC_UPDATE.md](../DOC_UPDATE.md) for the maintenance spec. The run counter lives there; narrative changes live here.

---

## Run #1 — 2026-04-17

**Initial documentation bootstrap.**

Added:
- `docs/` tree with three audience folders: `technical/`, `user/`, `leadership/`.
- Top-level `docs/README.md` index.
- Technical docs:
  - `technical/README.md` (technical ToC)
  - `technical/architecture.md` (monorepo, data flow, build)
  - `technical/shared/schemas-reference.md`
  - `technical/server/README.md`, `api-reference.md`, `database-schema.md`, `leaderboard-queries.md`, `seed-and-migrations.md`, `environment.md`
  - `technical/web/README.md`
  - `technical/web/game-engine-overview.md` (split-file ToC for PongGame) + sub-pages: `game-engine-scene.md`, `game-engine-physics.md`, `game-engine-fx.md`
  - `technical/web/ai.md`, `input.md`, `router-lifecycle.md`, `ui-screens.md`, `content-quips.md`, `audio.md`
  - `technical/web/devpanel-overview.md` (split-file ToC for devpanel) + sub-pages: `devpanel-controls.md`, `devpanel-persistence.md`
- User docs: `user/README.md`, `getting-started.md`, `controls.md`, `game-modes.md`, `ai-difficulty.md`, `leaderboard-guide.md`, `self-hosting.md`
- Leadership docs: `leadership/README.md`, `executive-summary.md`, `product-overview.md`, `tech-stack.md`, `architecture-at-a-glance.md`, `operational-footprint.md`
- Repo-root `CLAUDE.md` instructing Claude to read `docs/README.md` at session start and follow `DOC_UPDATE.md` when updating docs.
- Repo-root `DOC_UPDATE.md` maintenance spec with `Run count: 1` and `Last run: 2026-04-17`.

Split-file ToCs created for:
- `packages/web/src/game/PongGame.ts` (1130 lines) → `game-engine-overview.md` + scene/physics/fx sub-pages.
- `packages/web/src/ui/devpanel.ts` (371 lines) → `devpanel-overview.md` + controls/persistence sub-pages.
- `packages/web/src/main.ts` (306 lines) covered by `router-lifecycle.md` without further splitting (single page stays readable).

Notes:
- One file that the planning inventory missed was added to the doc tree: `packages/web/src/audio/sound.ts` → `technical/web/audio.md`.
- Project memory entry written so future sessions open by reading `docs/README.md`.
