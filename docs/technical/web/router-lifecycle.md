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
| `/attract` | Pause idle watcher. Mount `startAttract({ root, canvas, onDismiss: () => go("/menu") })`. |
| `/menu` | Resume idle watcher. Mount `renderMenu(appRoot)`. |
| `/signup` | Resume idle watcher. Mount `renderSignup(appRoot)` — handles form + difficulty picker in one screen. |
| `/leaderboard` | Resume idle watcher. `renderLeaderboard(appRoot)`. |
| `/tuning` | Pause idle watcher. Show the thin overlay (`[ GFX TUNING MODE ]` + back button). Construct a demo `PongGame` (`pro` vs `expert`), mount the dev panel. |
| `/game` | Pause idle watcher. Resolve mode from `?mode` and `?difficulty`. Redirect to `/signup` if AI mode but no signed-in user. Enter mobile fullscreen + landscape. Mount rotate prompt. Mount HUD. Construct `PongGame`. Start, await result. If not aborted and AI mode → `api.recordMatch(...)`. Teardown, then `renderGameOver(...)`. |
| *not-found* | Resume idle watcher. `renderNotFound(appRoot)`. |

## Top-level lifecycle variables

`main.ts` holds six module-level `let` handles:

```ts
let activeGame:      PongGame | null
let activeHud:       ReturnType<typeof mountHud> | null
let activePause:     PauseHandle | null
let activeRotate:    RotateHandle | null
let activeAttract:   AttractHandle | null
let activeDevPanel:  DevPanelHandle | null
```

Plus `idleWatcher: IdleWatcherHandle | null` and `IDLE_TIMEOUT_MS = 60_000`.

## `clearScreen()` — the teardown ritual

Called at the top of every route handler. Runs in this order:

1. Compute `nextPath` from the current (updated) hash. If the next path is neither `/game` nor `/tuning`, we're **leaving gameplay**.
2. Wipe `#app`'s innerHTML.
3. Dismiss and null out each active handle: dev panel → attract → game (`dispose()`) → HUD → pause → rotate prompt. Each handle is responsible for removing its own DOM nodes and listeners.
4. If leaving gameplay, call `leaveGameplayViewport()` — releases orientation lock and exits fullscreen on mobile. Replays (staying on `/game`) keep fullscreen and landscape.
5. Remove the `active` class from the game canvas.

The order matters: dismiss the attract overlay *before* disposing its demo game so the teardown path doesn't race with animation-loop callbacks.

## Mobile fullscreen handoff

Only on `/game`. From [main.ts](../../../packages/web/src/main.ts):

```ts
void enterGameplayViewport();  // request fullscreen + lock landscape (touch devices only)
activeRotate = mountRotatePrompt();  // overlay that appears iff portrait
```

`enterGameplayViewport` / `leaveGameplayViewport` are no-ops on desktop (checked with `isTouchDevice()` — see [fullscreen.ts](../../../packages/web/src/ui/fullscreen.ts)). Orientation lock relies on the fullscreen context being established first, so we `await setTimeout(60)` before calling `lockLandscape()`.

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
