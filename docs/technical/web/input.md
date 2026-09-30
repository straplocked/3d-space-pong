# Input — keyboard and touch

Source: [packages/web/src/game/Input.ts](../../../packages/web/src/game/Input.ts).

A single `Input` class handles both keyboards and touchscreens. `PongGame` owns one instance, attaches it on `start()` (unless the mode is `demo`), and detaches it on `dispose()`.

## Keyboard

| Keys | Meaning |
| --- | --- |
| `W` / `S` | Player 1 up / down |
| `ArrowUp` / `ArrowDown` | Player 2 up / down |
| `Escape` | Pause (edge-triggered) |

Implementation:
- A `Set<string>` holds currently-held `KeyboardEvent.code` values. `player1Axis()` / `player2Axis()` poll it each frame.
- `e.preventDefault()` fires on `ArrowUp`, `ArrowDown`, `Space` to suppress page scroll.
- Escape is edge-triggered: pressing Escape sets `escapePressed = true`; the game loop reads it via `consumeEscape()`, which returns and clears the flag. Guarantees one press = one pause toggle.

## Touch

Touches are tracked per active touch point, keyed by `Touch.identifier`, in a `Map<number, { x, y }>` (`x` in raw client pixels, `y` normalized `0..1` from top of viewport). This lets multiple simultaneous touches be told apart — needed for 2P local, where each screen half drives its own paddle.

Two accessors read from that map:
- `getTouchY()` — the first tracked touch's Y, or `null`. Used for 1P vs AI: drag anywhere on screen, one touch, one paddle.
- `getTouchYForSide("left" | "right")` — the Y of whichever tracked touch's `x` falls on that half of `window.innerWidth`, or `null`. Used for 2P local so a thumb on the left half only ever drives the left paddle and vice versa; both can be active at once.

The game loop (`PongGame.updatePaddles`) picks which accessor to call based on `this.mode.kind`, and — if it returns non-null — the paddle tracks the finger directly (1:1 position control, no smoothing — see [physics](./game-engine-physics.md#human--touch)). Otherwise it falls back to the keyboard axis for that side.

### UI-touch filtering

The subtlety: we listen at the **window level** because the game canvas is often obscured by overlays (HUD, pause card, orientation-guard overlay). But that means we'd also intercept touches meant for buttons. If we called `preventDefault()` on those, mobile browsers cancel the subsequent synthetic click, and buttons become untappable.

Fix: `isUiTouch(e)` returns `true` when the event target matches:
```
button, a, input, select, textarea, [role="button"], [data-ui]
```
In that case the Input class **doesn't** track the touch and **doesn't** call `preventDefault()` — the browser's normal click machinery runs.

The `[data-ui]` escape hatch lets ad-hoc overlays opt into the same treatment without needing to be a button.

### Touch lifecycle

| Event | Action |
| --- | --- |
| `touchstart` (non-UI) | For each *new* touch in `changedTouches`, record `{x, y}` in the map, `preventDefault()`. |
| `touchmove` (non-UI) | For each touch in `changedTouches` already in the map, update its `{x, y}`, `preventDefault()`. |
| `touchend` / `touchcancel` | For each touch in `changedTouches`, delete it from the map. |

All four listeners are registered with `{ passive: false }` (keyboard listeners use the default) so `preventDefault()` works. They're removed by `detach()` alongside the keyboard listeners, and `keys`, `escapePressed`, and the `touches` map are all reset.

## Public surface

| Method | Returns | Notes |
| --- | --- | --- |
| `attach()` / `detach()` | — | Called by `PongGame.start()` / `PongGame.dispose()`. |
| `player1Axis()` | `-1 \| 0 \| 1` | `W=-1, S=+1`. |
| `player2Axis()` | `-1 \| 0 \| 1` | `ArrowUp=-1, ArrowDown=+1`. |
| `getTouchY()` | `number \| null` | 0..1 from top of viewport, first active touch. |
| `getTouchYForSide("left" \| "right")` | `number \| null` | 0..1, restricted to touches that started on that screen half. |
| `consumeEscape()` | `boolean` | `true` at most once per press. |

## Sign conventions

Both `player1Axis()` and `player2Axis()` return `-1` for "up on screen." This matches a natural convention: W = up, ↑ = up. Inside `PongGame`, paddle motion subtracts `vel * dt` from Y (see [physics](./game-engine-physics.md#human--keyboard)), so a negative axis produces a positive world-up motion. This is documented in-line in `PongGame.stepPaddleVelocity`.

## Interactions with other modules

- **HUD touch hint:** on touch devices the HUD shows touch-only copy (`DRAG ANYWHERE TO MOVE`, or `P1: DRAG LEFT HALF · P2: DRAG RIGHT HALF` in 2P) that fades after 4 s — see [ui-screens.md](./ui-screens.md#hud).
- **Pause / menu touches:** the pause button ([ui/hud.ts](../../../packages/web/src/ui/hud.ts)) attaches both `click` and `touchstart` listeners and calls `preventDefault()` + `stopPropagation()`. Combined with `isUiTouch`, a mobile tap on the pause glyph never bleeds into the paddle-drag code.
- **Audio unlock** ([main.ts](../../../packages/web/src/main.ts)): separate global listeners for `pointerdown`, `keydown`, `touchstart` unlock the Web Audio context on first gesture. These are independent of the Input class.
- **Attract dismissal** ([ui/attract.ts](../../../packages/web/src/ui/attract.ts)): attract mode listens for `keydown`, `mousedown`, `touchstart` with a 250 ms arming delay, not via the Input class — attract mode is not attached to a game.
- **Fullscreen / orientation** ([ui/fullscreen.ts](../../../packages/web/src/ui/fullscreen.ts), [ui/fullscreenToggle.ts](../../../packages/web/src/ui/fullscreenToggle.ts)): separate from the Input class entirely. `main.ts` auto-triggers fullscreen + landscape lock on touch devices when entering `/game`, and the app-wide orientation guard ([ui/rotate.ts](../../../packages/web/src/ui/rotate.ts)) covers every screen with a rotate overlay in portrait on coarse-pointer touch devices (see [ui-screens.md](./ui-screens.md#orientation-guard)); a manual **FULLSCREEN** button on the menu (mounted by `fullscreenToggle.ts`) wraps the same helpers for an explicit toggle, and hides itself when the Fullscreen API is unsupported or the app is already running installed (`display-mode: fullscreen` / `standalone`).
