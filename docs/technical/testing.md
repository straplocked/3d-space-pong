# Testing

Two layers:

1. [Vitest](https://vitest.dev/) unit/API tests across all three packages (`pnpm test`) — fast, no browser.
2. A small [Playwright](https://playwright.dev/) browser suite (`pnpm test:e2e`) for behavior Vitest + jsdom can't exercise: the real WebGL game loop, the orientation guard, the Wake Lock API, and fullscreen transitions. See [Browser tests (Playwright)](#browser-tests-playwright) below.

## Running

```bash
pnpm test
```

Root script: `pnpm --filter @3d-space-pong/shared run build && vitest run`. The shared build runs first because server/web code imports `@3d-space-pong/shared` as a built package (`main: "./dist/index.js"`), and that import is exercised for real at runtime (e.g. [routes/signup.ts](../../packages/server/src/routes/signup.ts) imports the live `SignUpSchema` object, not just its type).

To run one package's tests during development: `pnpm exec vitest run packages/server` (or `packages/web`, `packages/shared`).

## Configuration

One flat config at the repo root — [vitest.config.ts](../../vitest.config.ts) — rather than a per-package Vitest workspace:

```ts
export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/*/test/**/*.test.ts"],
    watch: false,
  },
});
```

Test files live in a `test/` folder alongside each package's `src/` (not inside `src/`, so `tsc`'s `include: ["src/**/*"]` never type-checks them as part of `pnpm typecheck` — Vitest transpiles them itself via esbuild).

The default environment is Node. The handful of DOM-touching web tests opt into jsdom per-file with a pragma comment at the top of the file:

```ts
// @vitest-environment jsdom
```

rather than needing a separate project config. `jsdom` is a root devDependency.

## What's covered, by package

### `packages/shared` — [test/schemas.test.ts](../../packages/shared/test/schemas.test.ts)

Zod schema validation: `SignUpSchema`, `MatchResultSchema`, `LeaderboardQuerySchema`, `DifficultySchema`/`OutcomeSchema` — valid inputs, defaults, coercion (`limit` string → number), and rejection of out-of-range/invalid values.

### `packages/server` — [test/](../../packages/server/test/)

Fastify `.inject()` tests against a **real temporary SQLite file** with real Drizzle migrations applied (not a mock) — [test/helpers.ts](../../packages/server/test/helpers.ts)'s `setUpTestApp()`:

1. Creates a throwaway file under the OS temp dir and points `DB_URL` at it.
2. Dynamically imports `db/client.ts` and runs `migrate()` against it, using the real migrations folder — exercising the exact migration path the fix in [seed-and-migrations.md](./server/seed-and-migrations.md) depends on.
3. Dynamically imports `app.ts` and calls `buildApp({ serveWeb: false })`.

The dynamic imports (after `DB_URL` is set) matter: `db/client.ts` resolves its SQLite path once at module-load time, and Vitest gives each test *file* its own module registry, so this is always the first time that module loads for a given file. The seed step (`seedIfEmpty()`) is intentionally not run — tests build their own fixture data via the API itself (signup → matches → leaderboard).

| File | Covers |
| --- | --- |
| [health.test.ts](../../packages/server/test/health.test.ts) | `GET /api/health`. |
| [signup.test.ts](../../packages/server/test/signup.test.ts) | Create, upsert-by-email, duplicate display name (409), validation errors (400). |
| [matches.test.ts](../../packages/server/test/matches.test.ts) | Record a match, 404 on unknown user, validation errors (bad difficulty, out-of-range score). |
| [leaderboard.test.ts](../../packages/server/test/leaderboard.test.ts) | `sort=wins` and `sort=losses` ordering against seeded fixture users, `limit`, validation errors (bad `sort`, out-of-range `limit`). |

### `packages/web` — [test/](../../packages/web/test/)

Pure/near-pure game logic that doesn't need three.js or a real canvas:

| File | Covers |
| --- | --- |
| [AI.test.ts](../../packages/web/test/AI.test.ts) | `DIFFICULTY_PROFILES` shape and monotonicity, `AIController.computeTargetY` (reaction-delay gating, clamping, Legend's predictive intercept vs. chase fallback), `maxSpeedFor`. No jsdom needed — see [ai.md](./web/ai.md). |
| [Input.test.ts](../../packages/web/test/Input.test.ts) | Keyboard axes (`player1Axis`/`player2Axis`, opposing-key cancellation), edge-triggered `consumeEscape()`, touch tracking (`getTouchY`, `getTouchYForSide`). Touch handlers are driven directly (`(input as any).onTouchStart(...)`) with a minimal fake-event shape, since jsdom doesn't implement real `Touch`/`TouchEvent` constructors. |
| [state.test.ts](../../packages/web/test/state.test.ts) | `getCurrentUser`/`setCurrentUser`/`clearCurrentUser` round-trip via `localStorage`, including malformed/mismatched-shape JSON. |
| [fullscreen.test.ts](../../packages/web/test/fullscreen.test.ts) | The pure-ish orientation/display-mode helpers from [ui/fullscreen.ts](../../packages/web/src/ui/fullscreen.ts): `isTouchDevice`, `isPortrait`, `isFullscreenSupported`, `isInstalledDisplayMode` (via a stubbed `matchMedia`). |

**Not covered by Vitest**: [PongGame.ts](../../packages/web/src/game/PongGame.ts) (needs a real `WebGLRenderer`/canvas), [ui/rotate.ts](../../packages/web/src/ui/rotate.ts) and [ui/wakeLock.ts](../../packages/web/src/ui/wakeLock.ts) (DOM-overlay construction and the Wake Lock API are integration-shaped, not pure), and anything requiring a real browser (orientation lock, fullscreen transitions, PWA install prompts). These are covered instead by the Playwright suite below.

## Browser tests (Playwright)

[e2e/](../../e2e/) at the repo root, run with `pnpm test:e2e` ([playwright.config.ts](../../playwright.config.ts)). Added for task 842 — Vitest/jsdom has no WebGL context, no real `visibilitychange`/fullscreen transitions, and no Wake Lock API, so the game loop, [ui/rotate.ts](../../packages/web/src/ui/rotate.ts) and [ui/wakeLock.ts](../../packages/web/src/ui/wakeLock.ts) had no coverage at all until now.

### How it's wired

Playwright's `webServer` config runs the suite against a real **build**, not the Vite dev server:

1. `pnpm build` (shared → server → web) must run first — the config does not do this for you locally; CI's `e2e` job does.
2. `node packages/server/dist/index.js` boots on port `3713` against a fresh temp SQLite file (`DB_URL` pointing at a file under the OS temp dir, created once per run via `mkdtempSync`), so the server runs its own migrations and starts with empty leaderboard data.
3. All specs run serially (`workers: 1`) against that one server/DB instance.

Chromium is launched with `--use-gl=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist --disable-gpu-sandbox` so headless Chromium gets a real (software) WebGL context instead of silently refusing one. Every match-starting test asks `start2pMatch()` (in [e2e/support/helpers.ts](../../e2e/support/helpers.ts)) which path it got and, if WebGL genuinely isn't available in a given CI runner, falls back to asserting the readable `Can't Start Game` card ([ui/engineError.ts](../../packages/web/src/ui/engineError.ts)) instead of hanging — the gameplay-dependent assertions in that test are skipped and an annotation is recorded. In local and CI runs so far (the pinned `mcr.microsoft.com/playwright:v1.55.1-noble` image), every test gets the real WebGL path.

### Test-only hook

[src/testHooks.ts](../../packages/web/src/testHooks.ts) exposes `window.__E2E_HOOKS__.frame`, incremented once per rendered frame from `PongGame`'s `tick()` — the only way to assert "frames are advancing" without timing score changes. It ships in the production bundle but is **inert**: the hook object only exists when a Playwright test pre-seeds it with `addInitScript` before the page's own scripts run (see `seedFrameHook()` in [e2e/support/helpers.ts](../../e2e/support/helpers.ts)); a real player's browser never defines `window.__E2E_HOOKS__`, so the code path is a single property read that returns early.

### What's covered, by spec

| File | Covers |
| --- | --- |
| [menu-and-match.spec.ts](../../e2e/menu-and-match.spec.ts) | Menu renders; a 2P local match starts, the canvas goes `.active`, the HUD mounts, and frames advance. |
| [rotate.spec.ts](../../e2e/rotate.spec.ts) | Phone context (landscape, touch): no rotate overlay. Switched to portrait: overlay shows and a running match pauses. Back to landscape: overlay hides. |
| [visibility-pause.spec.ts](../../e2e/visibility-pause.spec.ts) | Simulated `document.visibilityState = "hidden"` pauses a running match. |
| [wake-lock.spec.ts](../../e2e/wake-lock.spec.ts) | A stubbed `navigator.wakeLock` (installed via `addInitScript`, never the real API) is `request()`-ed when a match starts and `release()`-d after quitting. |
| [fullscreen.spec.ts](../../e2e/fullscreen.spec.ts) | Task 847: clicking the menu's fullscreen toggle lands on `#/attract` with `document.fullscreenElement` set; dismissing attract (any click) returns to `#/menu` with fullscreen still on. |
| [leaderboard-tabs.spec.ts](../../e2e/leaderboard-tabs.spec.ts) | Hall of Fame / Hall of Shame tabs switch, including the `?tab=fame` deep link. |

### Running locally

The suite needs the exact Chromium build the `@playwright/test@1.55.1` pin expects. Either run `npx playwright install --with-deps chromium` once, or — to match CI exactly and avoid touching the host at all — use the pinned container:

```bash
pnpm build
docker run --rm -v "$(pwd)":/work -w /work --ipc=host --network host \
  mcr.microsoft.com/playwright:v1.55.1-noble \
  bash -lc "corepack enable && corepack prepare pnpm@9.0.0 --activate && pnpm install --frozen-lockfile && pnpm test:e2e"
```

`--network host` is only needed if the container otherwise can't reach the `webServer`'s `127.0.0.1:3713`; drop it if your Docker setup already routes that fine.

## CI

[.github/workflows/ci.yml](../../.github/workflows/ci.yml) has two test-shaped jobs:

- `gate` runs `pnpm test` (Vitest) between `Typecheck` and `Build`, as a hard gate — `publish` depends on `gate` and a failing test stops it (true since task 841; ran green in CI on `cb849a6` and `1310396` first).
- `e2e` runs the Playwright suite (`pnpm build` then `pnpm test:e2e`) inside the pinned `mcr.microsoft.com/playwright:v1.55.1-noble` container, uploading the HTML report as an artifact on failure. It runs after `gate` but **`publish` does not depend on it yet** — it's a new job (task 842) that needs to pass green in CI a few times before being added to `publish`'s `needs` list, same policy `gate`'s Test step followed before becoming a hard gate.
