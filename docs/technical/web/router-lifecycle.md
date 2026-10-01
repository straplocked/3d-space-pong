# Router and lifecycle

How the app navigates between screens, owns long-lived resources (game, HUD, overlays), and tears them down cleanly on every route change.

Sources: [packages/web/src/router.ts](../../../packages/web/src/router.ts), [packages/web/src/main.ts](../../../packages/web/src/main.ts).

## The router itself

A hash router in 54 lines. Paths are strings like `/menu` or `/game?mode=ai&difficulty=pro` — the fragment after `#` is the path, an optional `?query` is parsed into `URLSearchParams`.

Public API:
| Function | Purpose |
| --- | --- |
| `defineRoute(path, handler)` | Register a handler. `handler(params)` may be async. |
| `defineNotFound(handler)` | Fallback for unregistered paths. |
| `go(target)` | Navigate. If the hash doesn't change (same-route re-entry), calls the handler directly so replays still work. |
| `currentPath()` | Returns `"/menu"` if no hash, else the hash without leading `#`. |
| `startRouter()` | Binds `hashchange`. If no hash is set, redirects to `/attract`. |

The router is intentionally minimal — no nested routes, no history manipulation, no query-object helper. It's just enough for a hash-based SPA.

## Routes

Defined in [main.ts](../../../packages/web/src/main.ts):

| Route | Handler responsibilities |
| --- | --- |
| `/attract` | Pause idle watcher. Await the engine chunk (`engineOrNull()`), then mount `engine.startAttract({ root, canvas, onDismiss: () => go("/menu") })`. Construction failures render the engine-error card. |
| `/menu` | Resume idle watcher. Mount `renderMenu(appRoot)`. |
| `/signup` | Resume idle watcher. Mount `renderSignup(appRoot)` — handles form + difficulty picker in one screen. |
| `/leaderboard` | Resume idle watcher. `renderLeaderboard(appRoot, params)` — `params` carries the optional `?tab=fame\|shame`. |
| `/tuning` | Pause idle watcher. Await the engine chunk. Construct a demo `engine.PongGame` (`pro` vs `expert`) — on failure render the engine-error card and stop. Show the thin overlay (`[ GFX TUNING MODE ]` + back button), mount `engine.mountDevPanel`. |
| `/game` | Pause idle watcher. Resolve mode from `?mode` and `?difficulty`. Redirect to `/signup` if AI mode but no signed-in user. Enter mobile fullscreen + landscape (**before** any `await`). Await the engine chunk. Mount HUD. Construct `engine.PongGame` (failure → engine-error card). Acquire wake lock, disable parallax on touch, subscribe to visibility + orientation-guard changes. Start; pause immediately if the orientation guard is blocking. Await result, then release the wake lock / listeners and re-enable parallax. If not aborted and AI mode → `api.recordMatch(...)`. Teardown, then `renderGameOver(...)`. |
| *not-found* | Resume idle watcher. `renderNotFound(appRoot)`. |

## Top-level lifecycle variables

`main.ts` holds six module-level `let` handles:

```ts
let activeGame:      PongGame | null
let activeHud:       ReturnType<typeof mountHud> | null
let activePause:     PauseHandle | null
let activeWakeLock:  WakeLockHandle | null
let activeAttract:   AttractHandle | null
let activeDevPanel:  DevPanelHandle | null
```

Plus:

- `routeCleanups: Array<() => void>` — per-route teardown hooks (event subscriptions tied to a live match, e.g. the `visibilitychange` listener and the orientation-guard unsubscribe).
- `routeToken: number` — bumped by every `clearScreen()`. Async handlers capture it before an `await` and bail afterwards if the route changed meanwhile (see `engineOrNull()` below).
- `orientation` — the app-wide `OrientationGuard` from `mountOrientationGuard()`, mounted **once** at module load, not per route. See [ui-screens.md](./ui-screens.md#orientation-guard).
- `idleWatcher: IdleWatcherHandle | null` and `IDLE_TIMEOUT_MS = 60_000`.

`PongGame`, `AttractHandle` and `DevPanelHandle` are imported as **types only** — the runtime code lives in the lazily-loaded engine chunk.

## `clearScreen()` — the teardown ritual

Called at the top of every route handler. Runs in this order:

1. Compute `nextPath` from the current (updated) hash. If the next path is neither `/game` nor `/tuning`, we're **leaving gameplay**.
2. Wipe `#app`'s innerHTML.
3. Dismiss and null out each active handle: dev panel → attract → game (`dispose()`) → HUD → pause → wake lock (`release()`). Each handle is responsible for removing its own DOM nodes and listeners.
4. Run and empty `routeCleanups`, then bump `routeToken` so any in-flight async handler knows it is stale.
5. If leaving gameplay, call `leaveGameplayViewport()` — releases orientation lock and exits fullscreen on mobile — and `enableParallax()` (parallax is disabled on touch devices during a match). Replays (staying on `/game`) keep fullscreen and landscape.
6. Remove the `active` class from the game canvas.

The order matters: dismiss the attract overlay *before* disposing its demo game so the teardown path doesn't race with animation-loop callbacks.

## Lazy engine chunk

Everything three.js-dependent is split into a separate chunk re-exported by [engine.ts](../../../packages/web/src/engine.ts) (`PongGame`, `startAttract`, `mountDevPanel`, `loadGfxSettings`). `main.ts` loads it with:

```ts
const loadEngine = () => import("./engine.js");
```

`engineOrNull()` wraps that import: it captures `routeToken`, awaits the chunk, and returns `null` (caller stops) if the route changed during the await, or if the import failed — in which case it also calls `renderEngineError(appRoot, err)`. Each of `/attract`, `/tuning` and `/game` is async and additionally wraps engine construction in `try/catch`, since a WebGL context failure throws from the `PongGame`/attract constructor. See [ui-screens.md](./ui-screens.md#engine-error-screen).

After first paint the chunk is prefetched via `requestIdleCallback` (3 s timeout; `setTimeout(1500)` fallback) so tapping PLAY doesn't wait on the download. Prefetch errors are ignored. Result: the main bundle is ~104 kB, the engine chunk ~518 kB (~131 kB gzip); `vite.config.ts` raises `build.chunkSizeWarningLimit` to 560 for it. The service worker still precaches the engine chunk, so offline play is unaffected.

## Mobile session handling (`/game`)

From [main.ts](../../../packages/web/src/main.ts), in order:

```ts
void enterGameplayViewport();   // fullscreen + landscape lock (touch only) — BEFORE any await
const engine = await engineOrNull();
...
activeWakeLock = holdScreenAwake();
if (isTouchDevice()) disableParallax();
document.addEventListener("visibilitychange", onHidden);          // hidden → openPause()
routeCleanups.push(removeVisibilityListener,
                   orientation.onChange((blocked) => { if (blocked) openPause(); }));
const resultPromise = game.start();
if (orientation.isBlocked()) openPause();   // started while held in portrait
```

- `enterGameplayViewport()` must run before the engine `await` so it's still inside the tap's user-activation window (fullscreen requests need it). It and `leaveGameplayViewport()` are no-ops on desktop (`isTouchDevice()` — see [fullscreen.ts](../../../packages/web/src/ui/fullscreen.ts)). Orientation lock relies on fullscreen having landed, so there's a 60 ms delay before `lockLandscape()`.
- The pause overlay auto-opens when the tab/app is hidden, or when the phone is rotated to portrait (the app-wide orientation guard blocks).
- As soon as the match promise resolves, the wake lock is released, `routeCleanups` are run, and parallax is re-enabled — rather than waiting for the next route change.

## Match recording flow

After `game.start()` resolves:

```
result = await game.start();

if (activePause) activePause.dismiss();

if (result.aborted):
  dispose game + HUD, canvas inactive, go("/menu")
  return

if (gameMode.kind === "ai" && user):
  try await api.recordMatch({ ... })   // swallow errors with console.warn

dispose game + HUD, canvas inactive
renderGameOver(appRoot, { outcome, playerScore, aiScore, mode, difficulty })
```

The `try/catch` around `recordMatch` means a transient network failure doesn't break the end-of-match UX — the player still sees the game-over screen; the loss just doesn't make it to the leaderboard. See [api.ts](../../../packages/web/src/api.ts) for the thrown `ApiError` type.

## Idle-to-attract

`startIdleWatcher({ timeoutMs: 60_000, onIdle })` ticks a 60 s timer on every `keydown`, `mousedown`, `touchstart`, `mousemove`, `pointerdown`. When the timer fires:
```ts
if (path === "/game" || path === "/attract" || path === "/tuning") return;
go("/attract");
```

Game/attract/tuning routes pause the watcher on entry and resume it on exit. See [idle.ts](../../../packages/web/src/ui/idle.ts).

## Audio unlock

Three global listeners (`pointerdown`, `keydown`, `touchstart`) each call `sfx.unlock()` on fire. This resumes the AudioContext that iOS leaves suspended until a user gesture. The listeners stay attached for the whole session; `sfx.unlock()` is cheap after the first call. See [audio.md](./audio.md).

## Console easter egg

`printConsoleEasterEgg()` runs once on boot from [content/quips.ts](../../../packages/web/src/content/quips.ts). Prints an ASCII paddle + ball plus "I see you found the dev tools. Impressive. Still won't help you beat Legend." — styled with CSS in the `console.log` template so it renders cyan/monospace in DevTools.
