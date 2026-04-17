# Game engine — scene, lighting, bloom

> [Back to game-engine overview](./game-engine-overview.md)

How `PongGame` composes the visible world. Source: [packages/web/src/game/PongGame.ts](../../../packages/web/src/game/PongGame.ts).

## Renderer and camera

Constructor (lines ~204–241):

- `THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: "high-performance" })`.
- `setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5))` — see [overview](./game-engine-overview.md#mobile-vs-desktop-adaptation) for the rationale.
- Transparent background (`setClearColor(0x000000, 0)`) so the parallax background shows through.
- `shadowMap.enabled = true`; soft on desktop, hard on mobile.
- `ACESFilmicToneMapping` + `toneMappingExposure = currentGfx.toneExposure` — prevents highlights blowing out.
- Fog: `FogExp2(0x000500, currentGfx.fogDensity)` — very sparse, tuned so the 3D starfield still reads at depth.
- Camera: `PerspectiveCamera(55° fov, aspect, near=0.1, far=200)` at `(0, 9, 18)` looking at origin.

## Arena (`buildArena`, lines 276–369)

No floor, no walls — the arena is a region of space, not a box. The player's depth cue is paddle/ball shadows on an invisible shadow plane plus a subtle stage glow disc.

**What's in the arena:**

| Mesh | Material | Purpose |
| --- | --- | --- |
| Top / bottom boundary bars | `MeshBasicMaterial` green `0x00ff55`, `fog: false` | Collision boundary markers; bright enough to cross the bloom threshold. |
| Invisible shadow plane | `ShadowMaterial({ opacity: currentGfx.shadowOpacity })` | Catches shadows of paddles and ball; renders nothing else. Tuned by `shadowOpacity`. |
| Stage glow disc | `MeshBasicMaterial` with `vertexColors: true`, `transparent`, `opacity: currentGfx.stageOpacity`, `depthWrite: false` | Radial falloff from dim phosphor green at center to transparent at edge. Soft "this is the play volume" hint, no hard edge. |
| Center court line | Dim `MeshBasicMaterial`, `opacity: 0.55`, `fog: false` | Midfield reference line. |

Arena dimensions (module-level constants):
```ts
ARENA_WIDTH  = 20
ARENA_HEIGHT = 12
ARENA_DEPTH  = 2
```

## Paddles and ball (`buildPaddlesAndBall`, lines 531–608)

Geometry: `BoxGeometry(0.4, 2.6, 1.5)` paddles, `SphereGeometry(0.3, 24, 24)` ball.

Materials (`MeshStandardMaterial`, kept on `this.leftPaddleMat` / `rightPaddleMat` / `ballMat` for live tuning):

| Entity | Color | Emissive | `emissiveIntensity` source |
| --- | --- | --- | --- |
| Left paddle body | `0x2a8a4a` (muted green) | `0x00ff41` | `currentGfx.paddleEmissive` |
| Right paddle body | `0x8a6020` (muted amber) | `0xffb000` | `currentGfx.paddleEmissive` |
| Ball | `0x99ddbb` (pale green) | `0xd8ffe4` | `currentGfx.ballEmissive` |

Metalness `0.1`, roughness `0.45–0.5` — nearly all light energy goes into diffuse reflection.

Each paddle has a **trim strip** — a thin `MeshBasicMaterial` child at `z = PADDLE_DEPTH / 2 + 0.01`, colored pure green/amber with `fog: false`. This strip is the main contributor to the bloom pass; the paddle body itself stays mostly lit by the scene.

## Lights (`buildLights`, lines 610–661)

Four-light rig:

| Light | Type | Color | Base intensity | Position |
| --- | --- | --- | --- | --- |
| Ambient | `AmbientLight` | `0x88bba0` | `currentGfx.ambientIntensity` | — |
| Key | `DirectionalLight` | `0xe0ffea` | `currentGfx.keyLightIntensity` | `(7, 16, 8)` → origin, casts shadow |
| Fill | `DirectionalLight` | `0x3a7a52` | `0.2` (scaled by key ratio) | `(-6, 6, 4)` |
| Left rim | `PointLight` | `0x00ff41` | `0.25` (scaled by key ratio) | `(-9, 2, 4)` |
| Right rim | `PointLight` | `0xffb000` | `0.2` (scaled by key ratio) | `(9, 2, 4)` |

Key light shadow config:
- Map size: 512 (mobile) / 1024 (desktop).
- Orthographic camera bounds: `(-ARENA_WIDTH..ARENA_WIDTH, -ARENA_HEIGHT..ARENA_HEIGHT)`.
- `bias: -0.0003`, `radius: 2` (mobile) / `3` (desktop) for softness.

**Key ratio trick:** fill and rim intensities are scaled proportionally with the key light in `applyGfx` (`keyRatio = next.keyLightIntensity / 1.25`). This is why dragging the key-light slider visibly changes the whole scene — otherwise it would only move a single numeric value.

## Post-processing pipeline

```
RenderPass  →  UnrealBloomPass  →  OutputPass
```

Built in the constructor (lines 254–268). UnrealBloomPass size is `viewport × bloomScale`, with `bloomScale = 0.5` on mobile (quarter-res bloom, 4× cheaper) and `1.0` on desktop.

Bloom parameters come from `currentGfx`:
- `bloomStrength` (default `0.42`)
- `bloomRadius` (default `1.63`)
- `bloomThreshold` (default `0.43`)

Only pixels above the threshold bloom — trim strips and the ball core cross it; paddle bodies usually don't. That's deliberate: the aesthetic is "a few very bright lines in a mostly dark scene," not "everything glows."

## `applyGfx(partial)` — live tuning

Lines 1032–1098. Merges `partial` into `currentGfx`, then propagates:

- `bloomPass.{strength,radius,threshold}`
- `renderer.toneMappingExposure`
- `scene.fog.density` (FogExp2)
- Lights: `keyLight.intensity`, `ambientLight.intensity`, and the three proportionally scaled lights (`fillLight`, `leftRimLight`, `rightRimLight`)
- `stageMesh.material.opacity`, `shadowPlane.material.opacity`
- `starMat.{size,opacity}`, `dustMat.{size,opacity}`
- `leftPaddleMat.emissiveIntensity`, `rightPaddleMat.emissiveIntensity`, `ballMat.emissiveIntensity`

Fields that would require rebuilding scene objects — star count, dust count, paddle dimensions — are deliberately **not** in `GfxSettings`.

## Resize handling

`handleResize()` (lines 695–702) resizes renderer + composer and updates camera aspect on every `window.resize`. Listener is attached in the constructor and removed in `dispose()`.
