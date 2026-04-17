# Dev panel — overview

> [Back to web ToC](./README.md)

A floating graphics-tuning panel mounted on the `/game` and `/tuning` routes. Every live-tunable knob in [`PongGame.GfxSettings`](./game-engine-overview.md#gfxsettings) is exposed as a slider; changes apply instantly (no rebuild) and persist to `localStorage` so your tuning survives reloads.

Source: [packages/web/src/ui/devpanel.ts](../../../packages/web/src/ui/devpanel.ts) (371 lines).

## Sub-pages

| Doc | Covers |
| --- | --- |
| [Controls](./devpanel-controls.md) | Slider sections and their ranges. |
| [Persistence](./devpanel-persistence.md) | `localStorage` keys, reset/export, visibility, keyboard toggle, FPS readout. |

## When it's mounted

- **`/tuning` route** ([main.ts](../../../packages/web/src/main.ts)): dedicated tuning mode. Constructs a demo `PongGame` (`pro` vs `expert`) so the panel has live content to tune against. No HUD, no pause, no user input. Press `←` MENU to exit.
- **`/game` route**: the panel is **not** mounted during real gameplay in the current code. Gameplay reads saved settings via `loadGfxSettings()` and applies them with `game.applyGfx(saved)` at the start of the match — see [router & lifecycle](./router-lifecycle.md).

The `/attract` route intentionally does **not** mount the panel: the attract loop dismisses on any input, and the panel's click surface would fight that behavior.

## Architecture

```
┌──────────────── devpanel.ts ──────────────────┐
│                                                │
│  SECTIONS (static config)                      │
│    [post-processing, lighting, atmosphere,     │
│     stars, stage] × controls[]                 │
│                                                │
│  mountDevPanel({ game })                       │
│    ├─ build DOM (toggle btn + panel)           │
│    ├─ apply saved gfx to game                  │
│    ├─ wire sliders: input → applyGfx(partial)  │
│    │                       + saveGfxSettings   │
│    ├─ wire reset → defaultGfx + clear storage  │
│    ├─ wire export → clipboard (TS code)        │
│    ├─ wire ` keyboard toggle                   │
│    └─ FPS poll every 250ms → color-coded       │
│                                                │
│  destroy()                                     │
│    remove listeners, kill interval, .remove()  │
└────────────────────────────────────────────────┘
```

## Public API

```ts
export function mountDevPanel(opts: { game: PongGame }): DevPanelHandle

export interface DevPanelHandle {
  destroy(): void;
}

export function loadGfxSettings(): Partial<GfxSettings> | null
```

`loadGfxSettings()` is also imported by [ui/attract.ts](../../../packages/web/src/ui/attract.ts) and the `/game` handler — so the demo and real gameplay render with the user's saved tuning, even when the panel itself isn't mounted.

## Related

- `GfxSettings` shape and defaults → [game-engine-overview](./game-engine-overview.md#gfxsettings)
- How `applyGfx` propagates changes → [game-engine-scene](./game-engine-scene.md#applygfxpartial--live-tuning)
