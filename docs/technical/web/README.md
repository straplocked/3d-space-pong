# Web overview

The front end is a single-page Vite app: TypeScript + three.js for the game, parallax.js for layered background depth, no framework on top. Everything is vanilla DOM — most UI screens are template strings rendered into `#app`.

Source: [packages/web/src/](../../../packages/web/src/).

## Entry point and boot sequence

[packages/web/src/main.ts](../../../packages/web/src/main.ts):

1. Import CSS.
2. `initParallax()` — init parallax.js on `#parallax-bg`.
3. `printConsoleEasterEgg()` — ASCII art + cheeky line in the devtools console.
4. Define routes: `/attract`, `/menu`, `/signup`, `/leaderboard`, `/tuning`, `/game`, plus a not-found fallback.
5. `startIdleWatcher(...)` — 60 s of no input on an idle-eligible route bounces to `/attract`.
6. Bind `unlockAudio()` to first user gesture (required for iOS Web Audio).
7. `startRouter()` — if no hash is set, go to `/attract`; otherwise dispatch the current hash.

## Routes → which doc

| Route | Doc |
| --- | --- |
| `/attract` | [UI screens → attract](./ui-screens.md#attract) |
| `/menu` | [UI screens → menu](./ui-screens.md#menu) |
| `/signup` | [UI screens → signup](./ui-screens.md#signup) |
| `/leaderboard` | [UI screens → leaderboard](./ui-screens.md#leaderboard) |
| `/tuning` | [Dev panel overview](./devpanel-overview.md) |
| `/game` | [Router & lifecycle](./router-lifecycle.md), [Game engine overview](./game-engine-overview.md) |

## Pages in this section

- **Game engine** (split — source is 1130 lines):
  - [Overview + lifecycle](./game-engine-overview.md)
  - [Scene, lighting, bloom](./game-engine-scene.md)
  - [Physics and scoring](./game-engine-physics.md)
  - [Starfield, dust, particles](./game-engine-fx.md)
- [AI](./ai.md)
- [Input](./input.md)
- [Router & lifecycle](./router-lifecycle.md)
- **Dev panel** (split):
  - [Overview](./devpanel-overview.md)
  - [Controls](./devpanel-controls.md)
  - [Persistence](./devpanel-persistence.md)
- [UI screens](./ui-screens.md)
- [Content / quips](./content-quips.md)
- [Audio](./audio.md)

## Files not covered elsewhere

| File | Purpose |
| --- | --- |
| [api.ts](../../../packages/web/src/api.ts) | Typed fetch client. `api.health`, `api.signup`, `api.recordMatch`, `api.leaderboard`. Exports `ApiError`. |
| [state.ts](../../../packages/web/src/state.ts) | `getCurrentUser` / `setCurrentUser` / `clearCurrentUser` backed by `localStorage` key `3d-space-pong:user`. |
| [router.ts](../../../packages/web/src/router.ts) | Tiny hash router with query-string support. See [router & lifecycle](./router-lifecycle.md). |
| [types/parallax-js.d.ts](../../../packages/web/src/types/parallax-js.d.ts) | Ambient types for parallax-js. |
| [styles.css](../../../packages/web/src/styles.css) | Single global stylesheet. Terminal / phosphor aesthetic. |

## Top-level orchestration

The five "active" lifecycle variables in [main.ts](../../../packages/web/src/main.ts) (`activeGame`, `activeHud`, `activePause`, `activeRotate`, `activeAttract`, `activeDevPanel`) are owned by the route handlers and cleaned up in `clearScreen()` on every route change. See [router & lifecycle](./router-lifecycle.md) for the teardown sequence and the mobile-fullscreen handoff.
