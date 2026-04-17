# Game engine — starfield, dust, particles

> [Back to game-engine overview](./game-engine-overview.md)

The two particle systems that sell the "in deep space" feel. Source: [packages/web/src/game/PongGame.ts](../../../packages/web/src/game/PongGame.ts).

## Starfield (`buildStarfield`, lines 371–445)

A `THREE.Points` cloud placed on a sphere shell around the arena, so the arena appears to float with stars in every direction.

**Geometry**
- Count: 900 (mobile) / 1800 (desktop).
- Sampling: uniform sphere-shell sampling (uniform over solid angle × uniform in `r`).
- Radius: `70 + rand() * 110` — so the closest stars are well outside the play volume (arena radius ≈ 10) and the farthest are inside both the camera far plane (200) and the fog falloff.

**Color tinting** — weighted palette, matches the CSS starfield:
| Probability | Tint | RGB |
| --- | --- | --- |
| 6 % | Amber | `(1.00, 0.78, 0.32)` |
| 16 % | Cyan | `(0.45, 0.95, 1.00)` |
| 28 % | Bright phosphor green | `(0.55, 1.00, 0.65)` |
| 50 % | Dim white-green | `dim * (0.85, 1.00, 0.85)`, `dim ∈ [0.55, 0.95]` |

**Material** — `PointsMaterial` with:
- `size: currentGfx.starSize`, `opacity: currentGfx.starOpacity`
- `vertexColors: true`, `transparent: true`
- `fog: false` — stars are past the fog falloff and need to stay visible
- `sizeAttenuation: true` (closer stars are bigger)
- `depthWrite: false`, `blending: AdditiveBlending` (stars glow onto the bloom pass)

The material reference is held on `this.starMat` so `applyGfx` can live-tune size and opacity.

## Dust (`buildDust`, lines 447–490)

Slow-drifting motes filling a wide volume **around** the arena — suggests the camera is floating through something, not just looking at a distant skybox.

**Geometry**
- Count: 100 (mobile) / 220 (desktop).
- Position spread: `±ARENA_WIDTH * 1.9` × `±ARENA_HEIGHT * 1.7` × `[-22, 10]` on z.
- Velocity spread (per particle, in wu/s):
  - `vx ∈ [-0.04, 0.04]`
  - `vy ∈ [0.01, 0.07]` (slight upward bias — "rising" dust)
  - `vz ∈ [-0.02, 0.02]`

Per-particle color: `dim * (0.45, 1.00, 0.55)`, `dim ∈ [0.35, 0.70]` — subtle greenish tint.

**Material** — `PointsMaterial` with:
- `size: currentGfx.dustSize`, `opacity: currentGfx.dustOpacity`
- `transparent: true`, `fog: true` (fades naturally with depth — gives the illusion of atmosphere)
- `sizeAttenuation: true`
- `depthWrite: false`

Material reference held on `this.dustMat` for live tuning.

## Dust update (`updateDust(dt)`, lines 496–529)

Called every frame from `tick()`. Integrates positions and wraps at a tight bounding box so nothing ever leaves — wraparound is invisible because the dust is sparse and dim.

```ts
xMax =  ARENA_WIDTH * 1.0;       xSpan = xMax * 2
yMax =  ARENA_HEIGHT * 0.9;      ySpan = yMax * 2
zMin = -22; zMax = 12;           zSpan = zMax - zMin

for each particle:
  p += v * dt
  if p.x >  xMax: p.x -= xSpan
  if p.x < -xMax: p.x += xSpan
  ... same for y, z ...
```

After the loop, the `position` buffer attribute is marked `needsUpdate = true` so three.js re-uploads it.

Note that the wrap bounds (`xMax = ARENA_WIDTH`, `yMax = ARENA_HEIGHT * 0.9`) are **tighter** than the initial spawn spread (`±ARENA_WIDTH * 1.9`, `±ARENA_HEIGHT * 1.7`). That's deliberate — at first tick, a handful of particles snap into the box; from then on everything stays inside and wraps smoothly.

## Why these are separate from `GfxSettings`

Particle **count** is not in `GfxSettings`: changing it would require re-allocating the BufferGeometry. `starSize`, `starOpacity`, `dustSize`, `dustOpacity` are all tunable at runtime because they just poke the shared material; no geometry rebuild is needed.

## Interplay with fog and bloom

- Dust respects fog (`fog: true`) → far dust fades into the ambient black. This produces the atmospheric haze without rendering a fog volume.
- Stars ignore fog (`fog: false`) + additive blending → they stay visible at depth and feed the bloom pass. Pair this with a high bloom threshold and you get stars that glint without washing the scene out.
