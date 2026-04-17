# Dev panel — controls

> [Back to dev-panel overview](./devpanel-overview.md)

The panel renders five sections of sliders. Each slider binds directly to one field of [`GfxSettings`](./game-engine-overview.md#gfxsettings); on input, the field is written back into a local `current` object, the displayed value is re-formatted, `game.applyGfx({ [key]: v })` is called, and `current` is persisted to `localStorage`.

Source: the `SECTIONS` array in [packages/web/src/ui/devpanel.ts](../../../packages/web/src/ui/devpanel.ts).

## Sections

### `// post-processing`
| Field | Range | Step | Default |
| --- | --- | --- | --- |
| `bloomStrength` | 0 – 2 | 0.01 | 0.42 |
| `bloomRadius` | 0 – 2 | 0.01 | 1.63 |
| `bloomThreshold` | 0 – 1 | 0.01 | 0.43 |
| `toneExposure` | 0.1 – 2 | 0.05 | 0.5 |

### `// lighting`
| Field | Range | Step | Default |
| --- | --- | --- | --- |
| `keyLightIntensity` | 0 – 3 | 0.05 | 1.25 |
| `ambientIntensity` | 0 – 1 | 0.01 | 0.13 |
| `shadowOpacity` | 0 – 1 | 0.01 | 1 |
| `paddleEmissive` | 0 – 1 | 0.01 | 0.14 |
| `ballEmissive` | 0 – 1 | 0.01 | 0.74 |

### `// atmosphere`
| Field | Range | Step | Default |
| --- | --- | --- | --- |
| `fogDensity` | 0 – 0.05 | 0.001 | 0.005 |
| `dustSize` | 0.05 – 0.5 | 0.01 | 0.05 |
| `dustOpacity` | 0 – 1 | 0.01 | 0.41 |

### `// stars`
| Field | Range | Step | Default |
| --- | --- | --- | --- |
| `starSize` | 0.1 – 2 | 0.05 | 0.55 |
| `starOpacity` | 0 – 1 | 0.01 | 0.06 |

### `// stage`
| Field | Range | Step | Default |
| --- | --- | --- | --- |
| `stageOpacity` | 0 – 1 | 0.01 | 0.05 |

Defaults come from `defaultGfx()` at the top of [packages/web/src/game/PongGame.ts](../../../packages/web/src/game/PongGame.ts). Canonical propagation of each field is documented in [game-engine-scene → applyGfx](./game-engine-scene.md#applygfxpartial--live-tuning).

## Value formatting

`formatValue(v, step)` chooses precision based on the slider's step:
- `step >= 1` → `v.toFixed(0)`
- `step >= 0.1` → `v.toFixed(1)`
- `step >= 0.01` → `v.toFixed(2)`
- otherwise → `v.toFixed(3)`

So a `fogDensity` of 0.005 reads as `0.005`, while a `keyLightIntensity` of 1.25 reads as `1.25`.

## "Export to code"

Clicking **EXPORT TO CODE** copies the current settings as a `defaultGfx()` function body to the clipboard — so tuning becomes code by replacing the body in [PongGame.ts](../../../packages/web/src/game/PongGame.ts).

```ts
// Produced by settingsToCode()
export function defaultGfx(): GfxSettings {
  return {
    bloomStrength: 0.42,
    bloomRadius: 1.63,
    ...
  };
}
```

The button tries `navigator.clipboard.writeText()` first (requires HTTPS or `localhost`). If that fails (e.g., LAN IP), it falls back to an off-screen `<textarea>` + `document.execCommand('copy')`. If **both** fail, the code is logged to the console and the button flashes `LOGGED TO CONSOLE`. Feedback appears for 1.5 s then the label resets.

## Reset

**RESET DEFAULTS** resets `current` to `defaultGfx()`, calls `game.applyGfx(defaults)`, wipes `localStorage`, and updates every slider + value span. Doesn't ask for confirmation.

## Fields intentionally excluded

Anything that would require rebuilding scene objects is not a slider:
- Star count (900 / 1800 by device)
- Dust count (100 / 220 by device)
- Paddle and arena dimensions
- Shadow map size

Those live as constants in [PongGame.ts](../../../packages/web/src/game/PongGame.ts) and in the device-adaptation logic. See [game-engine-overview → mobile vs desktop](./game-engine-overview.md#mobile-vs-desktop-adaptation).
