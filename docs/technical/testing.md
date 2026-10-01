# Testing

Baseline automated test suite added across all three packages, run with [Vitest](https://vitest.dev/). No browser/e2e testing yet — this covers unit and API-level tests only.

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

**Not covered**: [PongGame.ts](../../packages/web/src/game/PongGame.ts) (needs a real `WebGLRenderer`/canvas), [ui/rotate.ts](../../packages/web/src/ui/rotate.ts) and [ui/wakeLock.ts](../../packages/web/src/ui/wakeLock.ts) (DOM-overlay construction and the Wake Lock API are integration-shaped, not pure), and anything requiring a real browser (orientation lock, fullscreen transitions, PWA install prompts). These would need browser/e2e testing, which is explicitly out of scope for this baseline pass.

## CI

[.github/workflows/ci.yml](../../.github/workflows/ci.yml)'s `gate` job runs `pnpm test` between `Typecheck` and `Build`. The step is marked `continue-on-error: true` with a `TODO` to remove it once the suite has run green in CI a few times — the suite is new and has so far only been verified locally, and `publish` depends on `gate` completing, so a step that isn't yet proven stable in the CI environment must not be able to block it.
