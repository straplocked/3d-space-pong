# UI screens

All the non-game surfaces. These are vanilla TypeScript functions that write template strings into `#app` (or, for overlays, directly onto `document.body`). No framework, no virtual DOM.

Sources: [packages/web/src/ui/](../../../packages/web/src/ui/).

## Menu

Source: [ui/menu.ts](../../../packages/web/src/ui/menu.ts).

`renderMenu(root)` writes a terminal-style card with:
- A `.card-toggles` group in the top-right corner (kept off the "window chrome" title bar text on the left): an audio toggle (`sfx.setEnabled`, re-renders the card to update the label), a fullscreen toggle mounted via `mountFullscreenToggle()` from [ui/fullscreenToggle.ts](../../../packages/web/src/ui/fullscreenToggle.ts), and an **INSTALL** button mounted via `mountInstallButton()` from [ui/pwa.ts](../../../packages/web/src/ui/pwa.ts) (prepended to the group; see [Install button and offline pill](#install-button-and-offline-pill)). The fullscreen button hides itself when unsupported or already running as an installed PWA — see [input.md](./input.md#interactions-with-other-modules). On short landscape screens (`max-height: 500px`) the toggles collapse to icon-only.
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
- **Controls hint** — on desktop, `P1: W/S or DRAG LEFT · P2: ↑/↓ or DRAG RIGHT · ESC` in 2P mode, or `MOVE: W / S or DRAG · ESC` in AI mode. On touch devices (`isTouchDevice()`) the copy is touch-only — `P1: DRAG LEFT HALF · P2: DRAG RIGHT HALF` or `DRAG ANYWHERE TO MOVE` — and the hint gets the `.faded` class after 4 s (`TOUCH_HINT_MS`) so it doesn't sit over the paddles. The timer is cleared in `destroy()`.

Exposes `setScore(l, r)` and `destroy()`.

## Idle watcher

Source: [ui/idle.ts](../../../packages/web/src/ui/idle.ts).

`startIdleWatcher({ timeoutMs, onIdle })` returns `{ pause, resume, destroy }`. Listens on `keydown`, `mousedown`, `touchstart`, `mousemove`, `pointerdown`; resets a `setTimeout`. See [router & lifecycle](./router-lifecycle.md#idle-to-attract) for how the main handler wires it.

## Fullscreen helpers

Source: [ui/fullscreen.ts](../../../packages/web/src/ui/fullscreen.ts).

Helpers:
- `isTouchDevice()` — used across the app to gate mobile-specific behavior.
- `isPortrait()` — viewport aspect check (no longer used by the orientation guard, which uses a `matchMedia` query).
- `isFullscreenSupported()` / `isFullscreenActive()` / `isInstalledDisplayMode()` / `toggleFullscreen()` — used by the menu toggle, the orientation guard and `pwa.ts`.
- `enterFullscreen(el)` / `exitFullscreen()` — with webkit fallbacks; swallow errors.
- `lockLandscape()` / `unlockOrientation()` — no-ops on iOS (unsupported); swallow errors.
- `enterGameplayViewport()` / `leaveGameplayViewport()` — composite helpers called from `/game`. Short 60 ms delay between fullscreen and lock because the orientation API requires fullscreen to have landed.

## Orientation guard

Source: [ui/rotate.ts](../../../packages/web/src/ui/rotate.ts).

`mountOrientationGuard()` is called **once** at startup in [main.ts](../../../packages/web/src/main.ts) and covers every route (menu, signup, leaderboard, gameplay), not just `/game`. It returns an `OrientationGuard`:

| Member | Purpose |
| --- | --- |
| `isBlocked()` | `true` while the portrait overlay is showing. |
| `onChange(fn)` | Subscribe to blocked/unblocked transitions; returns an unsubscribe fn. The `/game` route uses it to open the pause overlay. |

Behavior:
- **Gate**: active only when `isTouchDevice()` **and** `matchMedia("(pointer: coarse)")` — a touchscreen laptop (fine primary pointer) gets a no-op guard.
- **Detection**: `matchMedia("(orientation: portrait)")` `change` events, plus a delayed (120 ms) re-check on `orientationchange` for older WebViews.
- **Overlay**: an opaque full-screen `role="alertdialog"` card ("Rotate to Landscape"), toggled via `.visible`; also toggles `html.orientation-blocked`.
- **Android browser tab** (not installed, Fullscreen API supported, `screen.orientation.lock` present): the overlay includes a **GO FULLSCREEN** button (`.rotate-lock-btn`) that calls `enterFullscreen()`, waits 60 ms, then `lockLandscape()` — lock only works inside fullscreen there.
- **Installed PWA** (`display-mode: fullscreen` / `standalone`): locks landscape on the first `pointerdown` (lock needs user activation).
- **iOS**: no lock API, so the overlay itself is the enforcement.

## Install button and offline pill

Source: [ui/pwa.ts](../../../packages/web/src/ui/pwa.ts).

- `initPwa()` — called once at startup. Listens for `beforeinstallprompt` (calls `preventDefault()` to suppress Chromium's mini-infobar and stashes the event) and `appinstalled` (clears it). Also mounts the offline pill.
- `mountInstallButton(container)` — adds an **INSTALL** button (`.fullscreen-toggle.install-toggle`) to the menu's `.card-toggles`, and an `.install-hint` note after the toggle group. Returns a no-op handle if already installed (`isInstalledDisplayMode()` or iOS `navigator.standalone`). Visible only when an install path exists:
  - **Chromium**: a stashed `beforeinstallprompt` → click replays `prompt()` (single-use; the event is cleared).
  - **iOS Safari** (incl. iPadOS reporting as Macintosh with touch): click toggles the "tap Share, then Add to Home Screen" hint.
  - Re-renders on installability changes; drops its listener if the menu re-rendered and detached it.
- **Offline pill** — a `role="status"` `.offline-pill` on `document.body` reading `OFFLINE · 2P local still works`, shown (`.visible`) while `navigator.onLine` is false; updated on `online` / `offline`.

## Engine error screen

Source: [ui/engineError.ts](../../../packages/web/src/ui/engineError.ts).

`renderEngineError(root, err)` — rendered by `/attract`, `/tuning` and `/game` when the lazily-loaded engine chunk fails to download or the engine constructor throws (see [router-lifecycle.md](./router-lifecycle.md#lazy-engine-chunk)). Logs the error, deactivates the canvas, and shows a **Can't Start Game** card with a plain message chosen by `describe(err)`:

| Condition | Message gist |
| --- | --- |
| Error message mentions WebGL | Couldn't create a WebGL context — check hardware acceleration, close other 3D tabs. |
| `navigator.onLine === false` | Engine not downloaded yet and device is offline — reconnect once to cache it. |
| Otherwise | Engine failed to load — reload. |

Buttons: **Reload** (`location.reload()`) and **Back to Menu** (`go("/menu")`). No humor here — error-copy rule from [content-quips](./content-quips.md). Before this existed, a WebGL failure left a hung HUD and an uncaught promise rejection.

## Wake lock

Source: [ui/wakeLock.ts](../../../packages/web/src/ui/wakeLock.ts).

`holdScreenAwake()` requests a Screen Wake Lock (`navigator.wakeLock.request("screen")`) for the duration of a match, and re-requests it on `visibilitychange` back to visible (the OS drops it when hidden). Best-effort: unsupported browsers get a no-op handle and denied requests are swallowed. Returns `{ release() }`; held in `activeWakeLock` by `main.ts` and released when the match resolves or in `clearScreen()`.

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

Wraps `parallax-js`. One idempotent `initParallax()` that attaches to `#parallax-bg`. `disableParallax()` / `enableParallax()` suppress / restore motion — `/game` disables parallax on touch devices (gyro-driven) for the duration of a match; it's re-enabled when the match ends and when leaving gameplay in `clearScreen()`.

## 404

Source: [ui/notFound.ts](../../../packages/web/src/ui/notFound.ts).

Tiny card with a pong pun and a back button. Registered via `defineNotFound` in [main.ts](../../../packages/web/src/main.ts).
