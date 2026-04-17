# Game engine — overview

> [Back to web ToC](./README.md)

The game engine is one class: `PongGame` in [packages/web/src/game/PongGame.ts](../../../packages/web/src/game/PongGame.ts) (1130 lines). It owns the WebGL renderer, the scene, the physics loop, and the post-processing pipeline. Because the file is large, this doc is split into three sub-pages plus this ToC.

## Sub-pages

| Doc | Lines in source (approx.) | Covers |
| --- | --- | --- |
| [Scene, lighting, bloom](./game-engine-scene.md) | 276–369, 531–661, 1032–1098 | Arena boundaries, shadow catcher, stage glow, paddles/ball meshes, lights, post-processing, `applyGfx` |
| [Physics and scoring](./game-engine-physics.md) | 85–111, 663–693, 763–1031 | Constants, paddle motion model, ball update, paddle collisions, scoring and match end |
| [Starfield, dust, particles](./game-engine-fx.md) | 371–529 | 3D starfield, dust cloud, wraparound update |

## Public API

Constructor:
```ts
new PongGame({
  canvas,           // HTMLCanvasElement — the <canvas id="game-canvas">
  mode,             // GameMode (see below)
  onScoreChange,    // (left, right) => void — HUD hook
  onPauseRequested, // () => void — fires on Escape in-game
})
```

Methods:
| Method | Purpose |
| --- | --- |
| `start(): Promise<GameResult>` | Begin the game loop. Resolves on score-to-win or `abort()`. |
| `pause()` / `resume()` | Suspend/resume physics; keeps rendering the frozen frame. |
| `abort()` | End the match immediately. Result comes back with `aborted: true`. |
| `applyGfx(partial)` | Live-tune any subset of `GfxSettings`. |
| `getGfx()` | Snapshot of current settings. |
| `getFps()` | Rolling average FPS over the last ~60 frames. |
| `dispose()` | Stop the loop, detach input, free GPU resources. |

## Modes

```ts
type GameMode =
  | { kind: "ai"; difficulty: Difficulty }
  | { kind: "local2p" }
  | { kind: "demo"; leftDifficulty: Difficulty; rightDifficulty: Difficulty };
```

- **`ai`** — P1 (keyboard `W/S` or touch) vs AI on the right.
- **`local2p`** — both paddles human (P1: `W/S`, P2: `↑/↓`).
- **`demo`** — both paddles AI, used by the attract mode and the `/tuning` route. Score resets on win so the rally never ends. Input is not attached.

Mode is set in the constructor; AI controllers are wired in the constructor too (see [ai.md](./ai.md)).

## Lifecycle

```
new PongGame({...})
     │
     ▼
  constructor
  ├─ detect mobile → adjust DPR, shadowMap type, antialias, particle counts
  ├─ build scene, paddles, ball, lights, stars, dust
  ├─ set up EffectComposer with RenderPass + UnrealBloomPass + OutputPass
  └─ construct Input (but do not attach yet)
     │
     ▼
  start()
  ├─ input.attach() unless mode === "demo"
  ├─ reset scores, paddle Ys, paddle velocities
  ├─ resetBall(randomSide)
  ├─ set renderer.setAnimationLoop(tick)
  └─ return Promise<GameResult>
     │
     ▼
  tick(time) each frame
  ├─ if input.consumeEscape() → onPauseRequested()
  ├─ if paused → composer.render() only
  ├─ compute dt (capped at 50ms), sample FPS
  ├─ updatePaddles(dt, nowSeconds)
  ├─ updateBall(dt)
  ├─ updateDust(dt)
  └─ composer.render()
     │
     ▼
  finish()  (reached SCORE_TO_WIN or abort() called)
  ├─ running = false; setAnimationLoop(null)
  ├─ compute durationMs (minus pausedAccumMs, minus in-progress pause)
  ├─ play win/loss sting (unless aborted or demo)
  └─ resolveResult({ playerScore, aiScore, outcome, durationMs, aborted })
```

### Pause semantics

`pause()` freezes physics and input polling but keeps calling `composer.render()` so the background doesn't go black. `resume()` adds the elapsed pause time to `pausedAccumMs` and resets `lastTickTime` so the next frame doesn't produce a massive `dt`.

`finish()` also accounts for in-flight pause time (if `abort()` is called while paused, the ongoing pause is excluded from `durationMs` too).

### Mobile vs desktop adaptation

| Knob | Mobile | Desktop |
| --- | --- | --- |
| `renderer.antialias` | `false` | `true` |
| `pixelRatio` cap | `1` | `1.5` |
| `shadowMap.type` | `PCFShadowMap` | `PCFSoftShadowMap` |
| Shadow map size | 512 × 512 | 1024 × 1024 |
| Bloom pass resolution | 0.5 × viewport | 1.0 × viewport |
| Star count | 900 | 1800 |
| Dust count | 100 | 220 |
| Shadow radius | 2 | 3 |

Detection: [`isTouchDevice()`](../../../packages/web/src/ui/fullscreen.ts) at construction time; cached on `this.isMobile`.

## GfxSettings

Fifteen fields, all runtime-tunable via `applyGfx()`. Defaults live in the `defaultGfx()` factory at the top of [PongGame.ts](../../../packages/web/src/game/PongGame.ts). The dev panel (see [devpanel-overview](./devpanel-overview.md)) binds sliders directly to these. Fields that would require rebuilding scene objects (star count, paddle dimensions) are intentionally **not** in `GfxSettings`.

## Related docs

- Difficulty controller: [ai.md](./ai.md)
- Input handling: [input.md](./input.md)
- Audio cues fired on `wallHit` / `paddleHit` / `score` / `win` / `loss`: [audio.md](./audio.md)
- How the /game route wires HUD + pause + fullscreen around this class: [router-lifecycle.md](./router-lifecycle.md)
