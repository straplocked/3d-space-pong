# Documentation Changelog

Dated log of documentation changes, one entry per DOC_UPDATE run. See [../DOC_UPDATE.md](../DOC_UPDATE.md) for the maintenance spec. The run counter lives there; narrative changes live here.

---

## Run #3 — 2026-09-30

**Mobile/PWA hardening: app-wide landscape guard, lazy three.js engine, wake lock, install button, engine error screen.**

Code changes this run documented:
- `packages/web/src/ui/rotate.ts` — rewritten. `mountRotatePrompt()` removed; new `mountOrientationGuard()` mounted once at startup (every route, not just `/game`). Active only on touch devices with a coarse primary pointer; uses `matchMedia("(orientation: portrait)")`; opaque overlay; toggles `html.orientation-blocked`; exposes `isBlocked()` / `onChange(fn)`. Android browser tabs get a GO FULLSCREEN button (fullscreen + landscape lock); installed PWAs lock landscape on first `pointerdown`; iOS relies on the overlay.
- `packages/web/src/main.ts` — `activeRotate` removed; new `activeWakeLock`, `routeCleanups`, `routeToken` (bumped in `clearScreen()`; async handlers bail if the route changed during an await). three.js engine lazy-loaded via `loadEngine()` / `engineOrNull()`; `/attract`, `/tuning`, `/game` are async and render `renderEngineError` on failure; engine chunk prefetched on `requestIdleCallback`. `/game`: `enterGameplayViewport()` before any await, wake lock held, parallax disabled on touch during the match, pause overlay auto-opens on `visibilitychange` (hidden) or when the orientation guard blocks (and immediately if the match starts in portrait); resources released as soon as the match resolves. `initPwa()` at startup.
- `packages/web/src/engine.ts` — new lazy-chunk entry re-exporting `PongGame`, `startAttract`, `mountDevPanel`, `loadGfxSettings`. Main JS bundle ~614 kB → ~104 kB; engine chunk ~518 kB (~131 kB gzip), still precached by the service worker.
- `packages/web/src/ui/wakeLock.ts` — new. `holdScreenAwake()` Screen Wake Lock, re-acquired on visibility return, best-effort.
- `packages/web/src/ui/engineError.ts` — new. `renderEngineError(root, err)` "Can't Start Game" card (WebGL failure / offline-before-cache / generic load failure) with Reload and Back to Menu.
- `packages/web/src/ui/pwa.ts` — new. `initPwa()` captures `beforeinstallprompt` / `appinstalled`; `mountInstallButton(container)` INSTALL button (Chromium prompt replay, iOS "Add to Home Screen" hint), hidden when installed; offline pill ("OFFLINE · 2P local still works").
- `packages/web/src/ui/menu.ts` — mounts the install button in `.card-toggles`.
- `packages/web/src/ui/hud.ts` — touch-only controls hint copy on touch devices, fades (`.faded`) after 4 s.
- `packages/web/src/game/PongGame.ts` — while paused, renders only when dirty (`needsRender` set on pause, resize, `applyGfx`, `webglcontextrestored`); `webglcontextlost` handler (`preventDefault()` + `onPauseRequested` for non-demo modes); listeners removed in `dispose()`.
- `packages/web/src/styles.css` — `.screen-root` scrolls vertically; safe-area left/right padding; new `@media (max-height: 500px)` short-landscape block; new `@media (pointer: coarse)` block (no pause backdrop blur, normal-blend scanlines, no selection/callouts on UI chrome); styles for `.install-hint`, `.offline-pill`, `.rotate-lock-btn`, `.hud-controls.faded`, `[hidden]` fix for toggle buttons; opaque rotate overlay.
- `packages/web/vite.config.ts` — `build.chunkSizeWarningLimit: 560`; manifest gains `categories: ["games", "entertainment"]` and `lang: "en"`.

Docs updated:
- `docs/technical/web/router-lifecycle.md` — route table (`/attract`, `/tuning`, `/game`), lifecycle variables (`activeWakeLock`, `routeCleanups`, `routeToken`, app-wide `orientation`), `clearScreen()` steps; "Mobile fullscreen handoff" replaced by new "Lazy engine chunk" and "Mobile session handling (`/game`)" sections.
- `docs/technical/web/README.md` — boot sequence (orientation guard, `initPwa()`, engine prefetch), lifecycle-variable summary, `engine.ts` and `styles.css` rows, PongGame line count.
- `docs/technical/web/ui-screens.md` — menu toggles (INSTALL), HUD touch hint, fullscreen helper list; "Rotate prompt" replaced by "Orientation guard"; new "Install button and offline pill", "Engine error screen", "Wake lock" sections; parallax enable/disable now used.
- `docs/technical/web/input.md` — orientation-guard overlay, HUD touch hint bullet.
- `docs/technical/web/game-engine-overview.md` — dirty-flag paused rendering, new "WebGL context loss" subsection, line count 1130 → 1182.
- `docs/technical/README.md` — UI screens ToC blurb.
- `docs/technical/architecture.md` — PWA paragraph (manifest fields, install/offline UI), new lazy-engine paragraph, data-flow steps 2 and 4.
- `docs/user/getting-started.md` — INSTALL button, app-wide landscape enforcement, GO FULLSCREEN on Android, auto-pause, screen stays awake, fading hint, Can't Start Game screen, offline badge, background engine download.
- `docs/user/controls.md` — touch hint, landscape requirement, GO FULLSCREEN, automatic pause.
- `docs/leadership/executive-summary.md`, `product-overview.md`, `architecture-at-a-glance.md` — mobile/PWA bullets and smaller initial download.
- Root `README.md` — INSTALL button in "Install as an app".

No new routes, API endpoints, or schemas. No new doc pages (new modules documented inside `ui-screens.md` / `router-lifecycle.md`).

Threshold notes: `packages/web/src/main.ts` is now 402 lines (was 306) — at the ~400-line mark, but much of it is comments and route wiring; `router-lifecycle.md` remains a single readable page, so no split this run. Re-evaluate next run. `PongGame.ts` grew to 1182 lines; the `DOC_UPDATE.md` split table still shows 1130 because only the counter changes there on a normal run — sub-page line ranges in `game-engine-overview.md` are approximate and have drifted by up to ~50 lines.

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
