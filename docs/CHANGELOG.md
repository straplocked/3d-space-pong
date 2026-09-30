# Documentation Changelog

Dated log of documentation changes, one entry per DOC_UPDATE run. See [../DOC_UPDATE.md](../DOC_UPDATE.md) for the maintenance spec. The run counter lives there; narrative changes live here.

---

## Run #2 — 2026-09-29

**PWA support (installable, fullscreen, offline local play).**

Code changes this run documented:
- `packages/web/vite.config.ts` — added `vite-plugin-pwa` (`generateSW` strategy), emitting `manifest.webmanifest` and `sw.js` at build time; API routes are `NetworkOnly`, app shell is precached, registration is production-only (`devOptions.enabled` stays false).
- `packages/web/public/icons/` — new PNG icon set (192, 512, 512 maskable, apple-touch-icon) generated from `scripts/icon-source.svg` by the new `scripts/generate-icons.mjs` (renders via the Playwright Docker image, same pattern as `scripts/screenshots.mjs` — no new native image-processing dependency).
- `packages/web/index.html` — added `apple-touch-icon`/favicon links and `apple-mobile-web-app-title`; the manifest `<link>` and SW registration `<script>` are injected automatically by `vite-plugin-pwa` at build time.
- `packages/web/src/ui/fullscreen.ts` — added `isFullscreenSupported`, `isFullscreenActive`, `isInstalledDisplayMode`, `toggleFullscreen`.
- `packages/web/src/ui/fullscreenToggle.ts` — new. Mounts a FULLSCREEN button, hidden when unsupported or already running as an installed PWA.
- `packages/web/src/ui/menu.ts` — added a `.card-toggles` group (audio + fullscreen buttons together, top-right) so neither collides with the card's title-bar text.
- `packages/web/src/game/Input.ts` — touch tracking changed from a single `touchY` to a `Map<identifier, {x,y}>`; added `getTouchYForSide("left" | "right")` alongside the existing `getTouchY()`.
- `packages/web/src/game/PongGame.ts` — 2P local now reads touch per side (left half → left paddle, right half → right paddle) before falling back to keyboard.
- `packages/web/src/ui/hud.ts`, `packages/web/src/styles.css` — HUD controls hint updated for 2P touch; HUD elements (`hud-score`, `hud-mode`, `hud-pause-btn`, `hud-controls`) now offset by `env(safe-area-inset-*)`.
- `packages/server/src/index.ts` — `@fastify/static` now sets `Content-Type: application/manifest+json` for `*.webmanifest` and `Cache-Control: no-cache` for `sw.js`.
- `.github/workflows/ci.yml` — new. Gate job (typecheck + build) on push/PR; publish job (build + push to `ghcr.io/straplocked/3d-space-pong`, tags `latest` + `git-<sha>`) on push to `main` only.

Docs updated:
- `docs/user/getting-started.md` — fullscreen toggle, 2P touch controls, new "Installing as an app" section.
- `docs/user/controls.md` — 2P split-screen touch, new "Fullscreen" section.
- `docs/user/self-hosting.md` — new "Progressive Web App" section (manifest/SW headers, no extra proxy config needed).
- `docs/technical/server/environment.md` — new "Static file headers" section.
- `docs/technical/web/input.md` — Touch section rewritten for the multi-touch map; public surface table gained `getTouchYForSide`; new bullet on fullscreen/orientation modules.
- `docs/technical/web/ui-screens.md` — menu section updated for the `.card-toggles` group.
- `docs/technical/architecture.md` — one paragraph on the PWA build/serve path.
- Root `README.md` — new "Install as an app" section, PWA feature bullet.

No new routes or schemas. No split-file threshold crossed this run.

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
