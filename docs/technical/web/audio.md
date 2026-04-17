# Audio — procedural Web Audio SFX

Source: [packages/web/src/audio/sound.ts](../../../packages/web/src/audio/sound.ts).

All sound is generated procedurally via oscillators — no audio files are shipped. The vibe is old-school arcade beeps-and-bloops.

## Public surface

```ts
export const sfx: SoundEngine;
```

Singleton `SoundEngine` exported at the bottom of the file. Everywhere in the app imports `{ sfx } from "../audio/sound.js"` and calls methods on it.

| Method | Purpose |
| --- | --- |
| `sfx.unlock()` | Resume a suspended `AudioContext`. Must be called from a user gesture (iOS requirement). |
| `sfx.setEnabled(on)` | Master mute. Persists to `localStorage` key `3d-space-pong:audio` (`"on"` \| `"off"`). |
| `sfx.isEnabled()` | Reads the current state. |
| `sfx.paddleHit()` | Short 520 Hz square beep (~0.07 s). |
| `sfx.wallHit()` | Lower 260 Hz square beep (~0.05 s). |
| `sfx.score()` | Two-note triad (880 → 660 Hz). |
| `sfx.win()` | Rising 1-5-8 arpeggio (C5 → E5 → G5 → C6). |
| `sfx.loss()` | Descending sad trombone on sawtooth (G4 → E♭4 → A♯3→F♯3 slide). |
| `sfx.menuBlip()` | Tiny 880 Hz blip for navigation clicks. |
| `sfx.menuSelect()` | Two-note confirm (660 → 990 Hz). |

## Lazy context creation

The `AudioContext` is created lazily in `ensureCtx()` on first use (or on `unlock()`). That avoids spawning a context for users who immediately land on a page that never plays audio (e.g., someone who opens the leaderboard link alone).

Master gain node is fixed at `MASTER_VOLUME = 0.18` when enabled, `0` when muted.

## `beep(freq, duration, type, offset, endFreq, gain)` — the primitive

Single-oscillator note with an attack-release envelope:
- `freq` Hz start, optional `endFreq` for an exponential slide.
- `type` — oscillator waveform (`"square"` / `"sawtooth"` / etc).
- `offset` — start time delay in seconds (for sequencing note runs).
- `gain` — peak envelope gain (0..1), multiplied by master volume.

The envelope is `setValueAtTime(0.0001) → exponentialRampToValueAtTime(gain, +0.005) → exponentialRampToValueAtTime(0.0001, +duration)`. The tiny starting value avoids "DC thump" clicks that straight `setValueAtTime(0)` produces with exponential ramps.

## Who calls what

| Caller | Methods |
| --- | --- |
| [game/PongGame.ts](../../../packages/web/src/game/PongGame.ts) | `paddleHit`, `wallHit`, `score`, `win`, `loss` |
| [ui/menu.ts](../../../packages/web/src/ui/menu.ts) | `menuSelect`, `menuBlip`, `setEnabled`, `isEnabled` |
| [main.ts](../../../packages/web/src/main.ts) | `unlock` on first gesture |

Win/loss stings are suppressed for demo mode and aborted matches — see `finish()` in [PongGame.ts](../../../packages/web/src/game/PongGame.ts).

## iOS unlock

iOS Safari creates the AudioContext in `suspended` state until the user interacts with the page. [main.ts](../../../packages/web/src/main.ts) attaches three global listeners (`pointerdown`, `keydown`, `touchstart`) that each call `sfx.unlock()`; they stay attached for the session because `unlock()` is cheap after the first call (just a state check).

## Persistence

`localStorage["3d-space-pong:audio"]` holds `"on"` or `"off"`. Read in the constructor, written on every `setEnabled`. If `localStorage` throws (privacy modes, etc.), the engine silently falls back to in-memory state.
