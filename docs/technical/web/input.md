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

On any touch that doesn't hit a UI element, the finger's Y coordinate (normalized `0..1` from top of viewport) is stored on `this.touchY`. The game loop calls `getTouchY()` each frame; if non-null, the paddle tracks the finger directly (1:1 position control — see [physics](./game-engine-physics.md#human--touch)).

### UI-touch filtering

The subtlety: we listen at the **window level** because the game canvas is often obscured by overlays (HUD, pause card, rotate prompt). But that means we'd also intercept touches meant for buttons. If we called `preventDefault()` on those, mobile browsers cancel the subsequent synthetic click, and buttons become untappable.

Fix: `isUiTouch(e)` returns `true` when the event target matches:
```
button, a, input, select, textarea, [role="button"], [data-ui]
```
In that case the Input class **doesn't** track the touch and **doesn't** call `preventDefault()` — the browser's normal click machinery runs.

The `[data-ui]` escape hatch lets ad-hoc overlays opt into the same treatment without needing to be a button.

### Touch lifecycle

| Event | Action |
| --- | --- |
| `touchstart` (non-UI, at least one touch) | Record first-touch Y, `preventDefault()`. |
| `touchmove` (non-UI) | Update first-touch Y, `preventDefault()`. |
| `touchend` / `touchcancel` (all touches gone) | Clear `touchY` to `null`. |

All four listeners are registered with `{ passive: false }` (keyboard listeners use the default) so `preventDefault()` works. They're removed by `detach()` alongside the keyboard listeners, and `keys`, `escapePressed`, and `touchY` are all reset.

## Public surface

| Method | Returns | Notes |
| --- | --- | --- |
| `attach()` / `detach()` | — | Called by `PongGame.start()` / `PongGame.dispose()`. |
| `player1Axis()` | `-1 \| 0 \| 1` | `W=-1, S=+1`. |
| `player2Axis()` | `-1 \| 0 \| 1` | `ArrowUp=-1, ArrowDown=+1`. |
| `getTouchY()` | `number \| null` | 0..1 from top of viewport. |
| `consumeEscape()` | `boolean` | `true` at most once per press. |

## Sign conventions

Both `player1Axis()` and `player2Axis()` return `-1` for "up on screen." This matches a natural convention: W = up, ↑ = up. Inside `PongGame`, paddle motion subtracts `vel * dt` from Y (see [physics](./game-engine-physics.md#human--keyboard)), so a negative axis produces a positive world-up motion. This is documented in-line in `PongGame.stepPaddleVelocity`.

## Interactions with other modules

- **Pause / menu touches:** the pause button ([ui/hud.ts](../../../packages/web/src/ui/hud.ts)) attaches both `click` and `touchstart` listeners and calls `preventDefault()` + `stopPropagation()`. Combined with `isUiTouch`, a mobile tap on the pause glyph never bleeds into the paddle-drag code.
- **Audio unlock** ([main.ts](../../../packages/web/src/main.ts)): separate global listeners for `pointerdown`, `keydown`, `touchstart` unlock the Web Audio context on first gesture. These are independent of the Input class.
- **Attract dismissal** ([ui/attract.ts](../../../packages/web/src/ui/attract.ts)): attract mode listens for `keydown`, `mousedown`, `touchstart` with a 250 ms arming delay, not via the Input class — attract mode is not attached to a game.
