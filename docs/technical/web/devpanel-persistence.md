# Dev panel — persistence and chrome

> [Back to dev-panel overview](./devpanel-overview.md)

How settings survive reloads, how the panel's visibility is controlled, and the live FPS readout.

Source: [packages/web/src/ui/devpanel.ts](../../../packages/web/src/ui/devpanel.ts).

## `localStorage` keys

| Key | Value | Set by |
| --- | --- | --- |
| `3d-space-pong:gfx-settings` | JSON-serialised `GfxSettings` | Any slider change → `saveGfxSettings(current)`. Cleared by RESET. |
| `3d-space-pong:gfx-visible` | `"true"` or `"false"` | Every `setVisible(...)` call. Defaults to visible on first run. |

`loadGfxSettings()` tolerates missing/garbage values — returns `null` on any parse error. Consumers (`mountDevPanel`, `main.ts`, `attract.ts`) spread it onto defaults so bad data never crashes gameplay.

## Applying saved settings elsewhere

- **On `/game` start** — [main.ts](../../../packages/web/src/main.ts) calls `loadGfxSettings()` and passes the result to `game.applyGfx(savedGfx)` before starting the loop. So real matches honor your tuning even though the panel itself isn't mounted during gameplay.
- **On attract demo** — [ui/attract.ts](../../../packages/web/src/ui/attract.ts) does the same before starting the demo `PongGame`.
- **On `/tuning` mount** — `mountDevPanel` spreads loaded settings onto `defaultGfx()` into its `current` object, then calls `game.applyGfx(current)` immediately so the demo reflects saved state from the first frame.

## Visibility

The panel is always in the DOM when mounted — visibility is a CSS class (`.hidden`) on the panel element and an active state on the toggle button.

Three ways to toggle:
1. **`[ GFX ]` toggle tab** — a sibling button to the panel. Visible whether the panel is open or closed. Clicking flips visibility.
2. **`[×] close button** — inside the panel header. Hides only.
3. **Backtick key** — `window.addEventListener("keydown", ...)`. Ignored when focus is in an `input`, `textarea`, or `[contenteditable]` (so you can type freely in form fields without the panel flickering).

Each toggle writes the new state to `3d-space-pong:gfx-visible`, so the choice persists.

## FPS readout

At the top of the panel:
```
FPS  60  desktop
```

Poll interval: 250 ms (`setInterval` → `game.getFps()`). The color class is set on the value span:

| FPS | Class | Color (from styles.css) |
| --- | --- | --- |
| `≥ 50` | `.ok` | green |
| `30 ≤ FPS < 50` | `.warn` | amber |
| `0 < FPS < 30` | `.bad` | red |
| `0` (no samples yet) | *(none)* | displays `--` |

Device label is `"mobile"` / `"desktop"` from `game.isMobile`.

## Teardown

`DevPanelHandle.destroy()`:
1. Remove the window `keydown` listener (the backtick handler).
2. `clearInterval(fpsTimer)`.
3. Remove the `.gfx-root` element from the DOM.

Called from `clearScreen()` in [main.ts](../../../packages/web/src/main.ts) on every route change. The demo `PongGame` is disposed separately — the panel doesn't own the game instance.

## Why settings are flat

`GfxSettings` is a flat record of primitives on purpose:
- `JSON.stringify` / `JSON.parse` trivially round-trips it.
- The `SECTIONS` config lists sliders by key; the input handler is generic across all of them.
- `settingsToCode()` can generate the `defaultGfx()` body by iterating `Object.entries(settings)` — no schema doubling.

Any field nested deeper than one level would break those three properties and force custom handling per-field.
