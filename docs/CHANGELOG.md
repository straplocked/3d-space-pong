# Documentation Changelog

Dated log of documentation changes, one entry per DOC_UPDATE run. See [../DOC_UPDATE.md](../DOC_UPDATE.md) for the maintenance spec. The run counter lives there; narrative changes live here.

---

## Run #6 — 2026-10-01

**Fullscreen starts attract mode and stays on (task 847); CI Test step is a hard gate (task 841).**

- `packages/web/src/ui/fullscreen.ts` — fullscreen ownership: automatic (entered by a match) vs player-chosen. `leaveGameplayViewport()` only exits automatic fullscreen; new `isFullscreenAutoEntered()`.
- `packages/web/src/main.ts` — global `fullscreenchange` listener routes a player-chosen fullscreen on a non-match screen to `/attract`.
- `packages/web/test/fullscreenOwnership.test.ts` — 4 tests (73 total).
- `.github/workflows/ci.yml` — Test step no longer `continue-on-error`.
- Docs: `docs/technical/web/router-lifecycle.md` (new Fullscreen starts attract mode section, step 5), `docs/technical/web/ui-screens.md` (Fullscreen helpers).

## Run #5 — 2026-09-30

**Hall of Fame leaderboard tab, Unraid template + non-colliding default port, dark-only decision documented, online-play scoping (research only).**

Code changes this run documented:
- `packages/web/src/ui/leaderboard.ts` — rewritten. Single Hall-of-Shame view replaced with a tabbed screen (🏆 Hall of Fame / 💀 Hall of Shame), reusing the `.leaderboard-tabs` CSS that already existed but was unused. `renderLeaderboard(root, params?)` now takes the route's `URLSearchParams`; `?tab=fame` selects Fame, anything else defaults to Shame. A `loadToken` counter discards a stale fetch if the tab is switched again before it resolves.
- `packages/web/src/main.ts` — `/leaderboard` route now passes `params` through to `renderLeaderboard`.
- `packages/web/src/ui/menu.ts` — "Hall of Shame" button renamed to "Leaderboards".
- `packages/web/src/ui/gameOver.ts` — "View Leaderboard" now deep-links `?tab=fame` after a win, `?tab=shame` after a loss.
- `packages/web/src/styles.css` — short-landscape (`max-height: 500px`) tweaks for `.leaderboard-tabs` (tighter margin, smaller button padding) so the tabs fit phones held sideways.
- `packages/web/index.html` — added `<meta name="color-scheme" content="dark">`, formalizing the already-dark-only rendering (manifest `theme_color`/`background_color` already matched; no CSS light-mode branch exists or is planned).
- `docker-compose.yml` — host port mapping changed from `3000:3000` to `3610:3000`. Container-internal port (`PORT` env, `EXPOSE`, healthcheck) is unchanged at `3000`.
- `unraid/3d-space-pong.xml` — new. dockerMan Community Applications template: `ghcr.io/straplocked/3d-space-pong:latest`, WebUI on host `3610` → container `3000`, `/app/data` path mapping, icon, overview, support/project URLs, and the server's env vars as advanced config fields.
- `scripts/screenshots.mjs` — rewritten for the dark-only decision: drops the light/dark pair capture (there's no light theme), adds a `VIEWPORTS` array (desktop 1440×900, phone-landscape 844×390) crossed with a `PAGES` array that now includes the two leaderboard tabs (`hall-of-fame`, `hall-of-shame`) in place of the old single `leaderboard` entry; phone viewport also emulates touch (`hasTouch`/`isMobile`) for a more realistic capture.
- `docs/assets/screenshots/` — regenerated: `menu-{desktop,phone}.png`, `game-{desktop,phone}.png`, `hall-of-fame-{desktop,phone}.png`, `hall-of-shame-{desktop,phone}.png` (8 files). Old `-light`/`-dark` pairs and `menu-mobile-pwa.png` removed.

Docs updated:
- `docs/technical/web/ui-screens.md` — "Leaderboard" section rewritten for the tabbed screen (column differences per tab, badge behavior, empty-state copy, game-over deep-link behavior); "Menu" section's button list updated.
- `docs/technical/web/router-lifecycle.md` — `/leaderboard` route row notes the `params` pass-through.
- `docs/technical/server/api-reference.md` — sort-modes table notes `wins` is the Hall of Fame tab, `losses` the Hall of Shame tab (default).
- `docs/technical/server/environment.md` — Compose section's port mapping updated to `3610:3000`; new "Unraid template" section describing `unraid/3d-space-pong.xml`.
- `docs/technical/architecture.md` — PWA paragraph gains a note on the dark-only decision and the three places it's enforced (manifest, `theme-color` meta, `color-scheme` meta).
- `docs/leadership/product-overview.md` — "Main menu" bullet renamed to Leaderboards; "Leaderboard semantics" section rewritten for both tabs and the win/loss-aware deep link; new "Dark-only (no light theme)" section documenting the decision.
- `docs/leadership/operational-footprint.md` — network bullet updated to the host/container port split.
- `docs/leadership/executive-summary.md` — out-of-scope WebSocket/multiplayer bullet now points at the new scoping doc.
- `docs/leadership/online-play-scope.md` — **new**. Research-only scoping doc: current engine/trust baseline, three options (WebRTC P2P + signalling, authoritative WebSocket server, rooms/matchmaking), a trade-off table, and a phased recommendation (start with P2P if pursued at all; escalate to an authoritative server only if online results should feed the same Hall of Fame / Hall of Shame leaderboard). No code.
- `docs/leadership/README.md` — links the new online-play-scope page.
- `docs/user/leaderboard-guide.md` — rewritten for both tabs (columns, badges, empty states, which tab game-over sends you to).
- `docs/user/README.md`, `docs/user/getting-started.md` — "Hall of Shame" menu references updated to "Leaderboards".
- `docs/user/self-hosting.md` — port references updated to the `3610` host default (container stays `3000`); new Unraid-template paragraph.
- Root `README.md` — Screenshots section rewritten for the dark-only, desktop+phone-landscape capture set; self-host / Unraid / environment-variables sections updated for the `3610` default host port; project-layout tree gains `unraid/`.

No new API endpoints or schemas — the Hall of Fame tab uses the `sort=wins` leaderboard query that already existed server-side (added before this run; the UI simply hadn't exposed it). No new doc pages except `online-play-scope.md`.

Threshold notes: no file crossed a split threshold this run. `packages/web/src/ui/leaderboard.ts` grew from 99 to 158 lines (still well under 300, no split needed). `main.ts` stays at 402 lines (net zero change from this run's edit).

---

## Run #4 — 2026-09-30

**Fix local build skipping DB migrations; add a baseline Vitest test suite.**

Code changes this run documented:
- `packages/server/scripts/copy-migrations.js` — new. Copies `src/db/migrations` → `dist/db/migrations` after `tsc`, since `tsc` only emits compiled `.ts` files and drops the `.sql`/journal files. Run as the second half of the server's `build` script (`tsc -p tsconfig.json && node scripts/copy-migrations.js`).
- `Dockerfile` — the runtime stage's explicit `COPY --from=build .../src/db/migrations .../dist/db/migrations` removed; redundant now that the server's own `build` puts migrations in `dist` directly, so a plain `COPY .../server/dist ./packages/server/dist` already has them.
- `packages/server/src/app.ts` — new. `buildApp(opts?: { serveWeb?: boolean })` builds (but doesn't start) the Fastify instance: logging, CORS, routes, and optional static web-bundle serving + SPA fallback. Split out of `index.ts` so tests can `.inject()` against it without also running migrate/seed/listen. Logger level defaults to `silent` when `NODE_ENV=test` (unless `LOG_LEVEL` is set), to keep test output clean.
- `packages/server/src/index.ts` — slimmed to the production entrypoint: run migrations, run `seedIfEmpty()`, call `buildApp()`, listen.
- `vitest.config.ts` (root), root `package.json` — `vitest` + `jsdom` devDependencies, new `test` script (`pnpm --filter @3d-space-pong/shared run build && vitest run`). Single flat config; web DOM tests opt into jsdom per-file via a `// @vitest-environment jsdom` pragma rather than a per-package Vitest workspace.
- `packages/shared/test/schemas.test.ts`, `packages/server/test/{helpers,health,signup,matches,leaderboard}.test.ts`, `packages/web/test/{AI,Input,state,fullscreen}.test.ts` — new. 69 tests total. Server tests run Fastify `.inject()` against a real temporary SQLite file with real Drizzle migrations applied (`test/helpers.ts`'s `setUpTestApp()`), not a mock.
- `.github/workflows/ci.yml` — `gate` job gets a `Test` step (`pnpm test`) between `Typecheck` and `Build`, marked `continue-on-error: true` with a `TODO` to remove it once the suite has run green in CI a few times (it was only verified locally this run); `publish` still depends only on `gate` completing, unaffected either way.

Docs updated:
- `docs/technical/testing.md` — new page: how to run the suite, config, what's covered per package (and what isn't, and why), CI wiring.
- `docs/technical/README.md`, `docs/README.md` — link the new testing page.
- `docs/technical/server/seed-and-migrations.md` — migrations section rewritten: `build` now copies migrations itself, so the "silently skipped in a misconfigured container" risk is specifically about the `copy-migrations.js` step now, not an unexplained Dockerfile-only fixup.
- `docs/technical/server/environment.md` — Dockerfile stage 3/4 description updated to match (migrations arrive via the server's own build, not a dedicated Dockerfile `COPY`).
- `docs/technical/server/README.md` — entry point section split into `app.ts` (`buildApp()`) vs. `index.ts`; scripts table `build` row and footnote updated.
- `docs/technical/web/ai.md` — one-line pointer to the new `AI.test.ts`.
- `docs/leadership/tech-stack.md` — `vitest` added to the "Build tooling" list.

No new routes, schemas, or Docker stages. No source file crossed the ~300-line split threshold this run.

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
