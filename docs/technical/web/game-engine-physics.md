# Game engine — physics and scoring

> [Back to game-engine overview](./game-engine-overview.md)

Simulation constants, the paddle motion model, ball motion, collision, and scoring. Source: [packages/web/src/game/PongGame.ts](../../../packages/web/src/game/PongGame.ts).

## Constants

Top of file (lines ~85–104):

| Constant | Value | Notes |
| --- | --- | --- |
| `ARENA_WIDTH` | 20 | World units. Paddle X is at `±(ARENA_WIDTH/2 - 0.6)`. |
| `ARENA_HEIGHT` | 12 | World units. Ball/paddle Y clamp is `±ARENA_HEIGHT/2`. |
| `ARENA_DEPTH` | 2 | Not used in collisions; visual only. |
| `PADDLE_WIDTH` | 0.4 | |
| `PADDLE_HEIGHT` | 2.6 | |
| `PADDLE_DEPTH` | 1.5 | |
| `BALL_RADIUS` | 0.3 | |
| `PADDLE_X_OFFSET` | `ARENA_WIDTH / 2 - 0.6` = 9.4 | |
| `HUMAN_PADDLE_MAX_SPEED` | 38 wu/s | Full-arena traversal in ≈ 0.32 s at max. |
| `HUMAN_PADDLE_ACCEL` | 260 wu/s² | 0 → max in ≈ 0.14 s. |
| `HUMAN_PADDLE_FRICTION` | 440 wu/s² | Decelerate to 0 in ≈ 0.09 s after release. |
| `BALL_INITIAL_SPEED` | 9 wu/s | |
| `BALL_SPEED_INCREMENT` | 0.6 wu/s | Added per paddle hit. |
| `BALL_MAX_SPEED` | 22 wu/s | Cap so the ball doesn't become uncatchable. |
| `SCORE_TO_WIN` | 7 | |

The paddle motion tuning (accel/friction balance) is such that a short tap (~60 ms) produces a small precise move instead of a lurch, while a hold moves at full speed. Touch input bypasses this model entirely (see below).

## Paddle motion (`updatePaddles`, lines 799–901)

### Human — keyboard

Uses the smoothed velocity model:
```ts
stepPaddleVelocity(currentVel, axis, dt):
  if axis !== 0:
    target = axis * MAX_SPEED
    return approach(currentVel, target, ACCEL * dt)
  else:
    return approach(currentVel, 0, FRICTION * dt)
```

`axis` is `-1` (W / ArrowUp), `+1` (S / ArrowDown), or `0`. Because the paddle update subtracts `vel * dt` from Y, an `axis` of `-1` produces a **negative** velocity that moves the paddle **up** on screen.

After integrating, the paddle Y is clamped to `[-halfH, +halfH]` where `halfH = ARENA_HEIGHT/2 - PADDLE_HEIGHT/2`. If the clamp fires, velocity is zeroed so the paddle doesn't keep accelerating into the wall.

### Human — touch

Touch bypasses the velocity model. If `input.getTouchY()` returns a non-null 0..1 value, the paddle Y tracks the finger directly:
```ts
targetY = (0.5 - touchY) * ARENA_HEIGHT
leftPaddle.position.y = clamp(targetY, -halfH, +halfH)
leftPaddleVel = 0
```

This is 1:1 position control, so fast drag = instant paddle. Details in [input.md](./input.md).

### AI / demo

The AI controller returns a target Y; the paddle approaches it with max step `maxSpeedFor(ARENA_WIDTH) * dt`. AI speed is a function of the difficulty profile — see [ai.md](./ai.md).

## Ball motion (`updateBall`, lines 903–955)

Per-frame:
1. Integrate position: `ball.x += vx * dt; ball.y += vy * dt`.
2. **Top/bottom wall bounce:** if `|ball.y| > ARENA_HEIGHT/2 - BALL_RADIUS`, snap to the wall, flip `vy`, play `sfx.wallHit()`.
3. **Paddle collisions:** `handlePaddleCollision(leftPaddle, true)` and `handlePaddleCollision(rightPaddle, false)`.
4. **Scoring:** if `|ball.x| > ARENA_WIDTH/2 + BALL_RADIUS`, award a point (see Scoring below).

## Paddle collision (`handlePaddleCollision`, lines 957–993)

AABB expanded by the ball radius. Two gatekeepers:
- The ball must be inside the expanded box.
- The ball must be moving **toward** the paddle (avoids re-triggering on the way out, which would cause stuck bounces).

On hit:
- Compute a **hit offset** on the paddle face: `relative = (ball.y - paddle.y) / (PADDLE_HEIGHT/2)`, clamped to `[-1, 1]`.
- Bounce angle: `relative * (π / 3)` — up to ±60° off horizontal.
- Speed: `min(currentSpeed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED)`.
- New velocity: `(cos(angle) * speed * direction, sin(angle) * speed, 0)` where direction is `+1` if the ball just hit the left paddle, `-1` otherwise.
- Ball X is snapped just past the paddle (`maxX` for left paddle, `minX` for right) so the next frame doesn't re-collide.
- `sfx.paddleHit()` fires.

This is the whole "where you hit the paddle decides where the ball goes" mechanic — the paddle is both a reflector and an angle selector.

## Scoring (`updateBall` tail + `finish`)

When the ball exits the left or right side:
1. Increment the opposing side's score, fire `onScoreChange`, play `sfx.score()`.
2. If the winning score is reached:
   - In **demo mode**, reset both scores to 0 and continue — the rally never ends.
   - Otherwise call `finish()`.
3. If `finish()` wasn't called, `resetBall(towardLeft)` launches the ball toward the side that just got scored on, with a random angle in `±22.5°`.

`finish()` does:
- Stop the animation loop.
- Compute `durationMs = now - startedAt - pausedAccumMs - extraPaused` where `extraPaused` accounts for an in-progress pause at the moment of abort.
- Play `sfx.win()` or `sfx.loss()` — unless `aborted` or `mode.kind === "demo"`.
- Resolve the `start()` promise with `{ playerScore, aiScore, outcome, durationMs, aborted }`.

## Reset and init

`resetBall(towardLeft)`:
```ts
ball.position.set(0, 0, 0)
angle = random() * π/4 - π/8            // ±22.5°
direction = towardLeft ? -1 : +1
ballVelocity = (cos(angle) * v * direction, sin(angle) * v, 0)
```

Called once in `start()` (random side) and again after every score (toward the side that just got scored on).

## Timestep

`tick(time)` computes `dt = min(50, time - lastTickTime) / 1000`. The 50 ms cap prevents a single skipped frame (e.g., alt-tabbed tab waking up) from producing a tunneling ball or a paddle that flies off-screen in one frame.

FPS samples are `1 / dt`, averaged over the last 60 samples. Exposed via `getFps()`; displayed in the dev panel.
