# UI screens

All the non-game surfaces. These are vanilla TypeScript functions that write template strings into `#app` (or, for overlays, directly onto `document.body`). No framework, no virtual DOM.

Sources: [packages/web/src/ui/](../../../packages/web/src/ui/).

## Menu

Source: [ui/menu.ts](../../../packages/web/src/ui/menu.ts).

`renderMenu(root)` writes a terminal-style card with:
- A `.card-toggles` group in the top-right corner (kept off the "window chrome" title bar text on the left): an audio toggle (`sfx.setEnabled`, re-renders the card to update the label) and a fullscreen toggle, mounted via `mountFullscreenToggle()` from [ui/fullscreenToggle.ts](../../../packages/web/src/ui/fullscreenToggle.ts). The fullscreen button hides itself when unsupported or already running as an installed PWA — see [input.md](./input.md#interactions-with-other-modules).
- Title + tagline.
- Primary buttons: **Fight The Machine** → `/signup`, **Betray a Friend** → `/game?mode=2p`, **Hall of Shame** → `/leaderboard`.
- Divider + tertiary row: **GFX Tuning** → `/tuning`, **Attract Mode** → `/attract`.

Every button fires a `sfx.menuSelect` or `sfx.menuBlip` before navigating. See [audio.md](./audio.md).

## Signup

Source: [ui/signup.ts](../../../packages/web/src/ui/signup.ts).

Dual-purpose screen: either the signup form (first-time) or the difficulty picker (returning user). `getCurrentUser()` decides which.

### Form path
- Inputs: `displayName`, `email`, `marketingConsent` checkbox.
- Submit validates client-side with `SignUpSchema.safeParse`; per-field errors populate `<div class="form-error" data-for="...">` elements.
- On zod failure, stay on the form. On API failure, show a global error banner with the server's message (or a generic "Couldn't reach the server." for network errors).
- On success: `setCurrentUser({ userId, displayName })`, then call `renderSignup(root)` again — the function is re-entrant and now renders the difficulty picker.

### Difficulty picker
- One card per difficulty — imports `DIFFICULTY_PROFILES` from `game/AI.ts` to get the name + subtitle.
- Click → `go("/game?mode=ai&difficulty=<d>")`.

Validation lives in [packages/shared/src/schemas.ts](../../../packages/shared/src/schemas.ts); see [schemas reference](../shared/schemas-reference.md).

## Leaderboard

Source: [ui/leaderboard.ts](../../../packages/web/src/ui/leaderboard.ts).

Single view of the Hall of Shame: `api.leaderboard({ sort: "losses", limit: 25 })`. Columns: rank, player (with badges), losses, fastest L, W/L. On server error, shows `"Couldn't reach the server."` — keeps it plain; the humor is in the content, not the error.

Badges:
- `🙈 ROOKIE VICTIM` if `row.lostToRookie` — at least one loss at `difficulty=rookie`.
- `👑 LEGEND SLAYER` if `row.beatLegend` — at least one win at `difficulty=legend`.

Badge semantics come from the server's `EXISTS` subqueries — see [leaderboard queries](../server/leaderboard-queries.md).

## Game-over

Source: [ui/gameOver.ts](../../../packages/web/src/ui/gameOver.ts).

Called from `main.ts` after a non-aborted match. Props: `{ outcome, playerScore, aiScore, mode, difficulty }`.

Renders:
- **Headline**: AI mode → `VICTORY` or `DEFEAT`; 2P mode → `PLAYER 1 WINS` or `PLAYER 2 WINS`.
- Final score (`P — A`).
- A context-aware quip via `pickGameOverQuip(...)` — see [content-quips](./content-quips.md).
- Buttons: **Play Again** (replay the same mode/difficulty), **Back to Menu**, and (AI mode only) **View Leaderboard**.

## Pause

Source: [ui/pause.ts](../../../packages/web/src/ui/pause.ts).

`showPauseOverlay({ onResume, onQuit })` appends a full-screen overlay `<div id="pause-overlay">` to `document.body` (not `#app`, so it sits above the HUD and game canvas). Guards against stacking: if one is already up, the existing one is removed first.

Returns a `PauseHandle` with `.dismiss()`. The pause-handling is owned by `main.ts`'s `/game` handler — it calls `game.pause()`, then shows the overlay, and wires Resume → `game.resume()` / Quit → `game.abort()`.

## HUD

Source: [ui/hud.ts](../../../packages/web/src/ui/hud.ts).

Appended to `document.body` (not `#app`) so it overlays the canvas. Renders:
- **Mode label**: `VS <DIFFICULTY>` (with subtitle from `DIFFICULTY_PROFILES`) or `2P LOCAL` (subtitle "Betray a friend").
- **Pause button** in the corner — listens to both `click` and `touchstart` with `preventDefault()` + `stopPropagation()` (so mobile taps don't leak into the Input touch handler — see [input.md](./input.md)).
- **Score** `<left> · <right>`.
- **Controls hint** — `P1: W / S · P2: ↑ / ↓ · ESC` in 2P mode, or `MOVE: W / S or DRAG · ESC` in AI mode.

Exposes `setScore(l, r)` and `destroy()`.

## Idle watcher

Source: [ui/idle.ts](../../../packages/web/src/ui/idle.ts).

`startIdleWatcher({ timeoutMs, onIdle })` returns `{ pause, resume, destroy }`. Listens on `keydown`, `mousedown`, `touchstart`, `mousemove`, `pointerdown`; resets a `setTimeout`. See [router & lifecycle](./router-lifecycle.md#idle-to-attract) for how the main handler wires it.

## Fullscreen helpers

Source: [ui/fullscreen.ts](../../../packages/web/src/ui/fullscreen.ts).

Five helpers:
- `isTouchDevice()` — used across the app to gate mobile-specific behavior.
- `isPortrait()` — used by rotate prompt.
- `enterFullscreen(el)` / `exitFullscreen()` — with webkit fallbacks; swallow errors.
- `lockLandscape()` / `unlockOrientation()` — no-ops on iOS (unsupported); swallow errors.
- `enterGameplayViewport()` / `leaveGameplayViewport()` — composite helpers called from `/game`. Short 60 ms delay between fullscreen and lock because the orientation API requires fullscreen to have landed.

## Rotate prompt

Source: [ui/rotate.ts](../../../packages/web/src/ui/rotate.ts).

`mountRotatePrompt()`. If not a touch device, returns a no-op handle. Otherwise appends an overlay with an icon + "Rotate to Landscape". Listens to `resize` and `orientationchange` and toggles `.visible` based on `isPortrait()`.

## Attract

Source: [ui/attract.ts](../../../packages/web/src/ui/attract.ts).

Three-phase loop:

| Phase | Duration | Content |
| --- | --- | --- |
| `title` | 5 s | Window-chrome frame + `3D SPACE PONG` + `PRESS ANY KEY TO START`. |
| `demo` | 15 s | `PongGame` in demo mode (`pro` vs `expert`). Applies saved GFX settings. |
| `shame` | 10 s | Fetches `api.leaderboard({ sort: "losses", limit: 25 })` (cached across cycles) and slow-scrolls it. |

Dismiss listeners (`keydown`, `mousedown`, `touchstart` with `capture: true`) are armed 250 ms after entering the title phase so the navigation that landed us here doesn't immediately bounce us out.

## Parallax

Source: [ui/parallax.ts](../../../packages/web/src/ui/parallax.ts).

Wraps `parallax-js`. One idempotent `initParallax()` that attaches to `#parallax-bg`. Optional `disableParallax()` / `enableParallax()` if we ever need to suppress motion (currently unused).

## 404

Source: [ui/notFound.ts](../../../packages/web/src/ui/notFound.ts).

Tiny card with a pong pun and a back button. Registered via `defineNotFound` in [main.ts](../../../packages/web/src/main.ts).
