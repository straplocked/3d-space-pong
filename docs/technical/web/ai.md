# AI — difficulty profiles and controller

Source: [packages/web/src/game/AI.ts](../../../packages/web/src/game/AI.ts).

The AI is one class (`AIController`) plus a lookup table of five profiles (`DIFFICULTY_PROFILES`). Pure logic — no three.js imports — so it's trivially unit-testable. Covered by [packages/web/test/AI.test.ts](../../../packages/web/test/AI.test.ts) — see [Testing](../testing.md).

## `DifficultyProfile`

```ts
interface DifficultyProfile {
  level: Difficulty;
  name: string;          // human display name, e.g. "Rookie"
  subtitle: string;      // flavor subtitle, shown on difficulty cards and HUD
  reactionDelay: number; // seconds — AI only re-targets at most this often
  maxSpeed: number;      // fraction of arena width per second (paddle max speed)
  trackingError: number; // fraction of arena half-height (random offset on each tick)
  predictive: boolean;   // if true, extrapolate to intercept point; otherwise chase current ball.y
}
```

## The five profiles

| Level | Name | Subtitle | `reactionDelay` (s) | `maxSpeed` | `trackingError` | `predictive` |
| --- | --- | --- | --- | --- | --- | --- |
| `rookie` | Rookie | Has never held a paddle before | 0.35 | 0.5 | 0.25 | ❌ |
| `amateur` | Amateur | Practiced for a weekend, feels unstoppable | 0.22 | 0.7 | 0.15 | ❌ |
| `pro` | Pro | Makes eye contact with you through the screen | 0.12 | 0.85 | 0.07 | ❌ |
| `expert` | Expert | Has read your source code | 0.06 | 0.95 | 0.03 | ❌ |
| `legend` | Legend | Is the source code | 0.02 | 1.0 | 0 | ✅ |

The subtitles are player-facing: they appear on the difficulty cards in [signup.ts](../../../packages/web/src/ui/signup.ts) and on the in-game HUD ("VS EXPERT — Has read your source code").

## `AIController`

State: `profile`, `targetY`, `nextReactionAt`, `currentRandomError`.

### `computeTargetY(ball, paddle, paddleX, halfHeight, now): number`

Called every frame from `PongGame.updatePaddles`. Re-computes the target at most once per `reactionDelay` seconds; in between, returns the cached `targetY`.

When the reaction timer fires:

1. Decide whether to extrapolate or chase:
   ```ts
   const ballHeadingTowardAI =
     (paddleX > 0 && ball.vx > 0) || (paddleX < 0 && ball.vx < 0);
   ```
2. If `predictive && ballHeadingTowardAI`:
   ```ts
   dt  = (paddleX - ball.x) / ball.vx            // time until ball reaches paddle X
   raw = ball.y + ball.vy * dt                   // intercept Y before wall bounces
   // Reflect into [-halfHeight, +halfHeight] to roughly account for one bounce
   while (raw >  halfHeight) raw = halfHeight - (raw - halfHeight);
   while (raw < -halfHeight) raw = -halfHeight + (-halfHeight - raw);
   ```
   Otherwise `raw = ball.y` — chase the current ball position.
3. Re-roll tracking error: `currentRandomError = (rand()*2-1) * trackingError * halfHeight`.
4. Store the target clamped to the paddle's allowed Y range:
   ```ts
   targetY = clamp(raw + currentRandomError, -halfHeight, halfHeight)
   nextReactionAt = now + reactionDelay
   ```

### `maxSpeedFor(arenaWidth): number`

Returns `arenaWidth * profile.maxSpeed` — the AI paddle's max speed in world units per second.

`PongGame` uses this in `updatePaddles` as the per-frame step cap:
```ts
const maxStep = aiController.maxSpeedFor(ARENA_WIDTH) * dt;
const dy = target - paddle.position.y;
const step = clamp(dy, -maxStep, maxStep);
paddle.position.y = clamp(paddle.position.y + step, -halfH, halfH);
```

## Why "Legend" is hard but not impossible

- `reactionDelay: 0.02` — retargeting basically every frame (the game loop is 60 fps ≈ 16 ms, so the AI picks up ball-state changes almost immediately).
- `trackingError: 0` — no random jitter.
- `maxSpeed: 1.0` — the AI paddle covers the full arena in 1 s (vs. the human's ~0.32 s at `HUMAN_PADDLE_MAX_SPEED = 38`, but remember that the human also has to accelerate). In practice the AI can still be out-angled by aggressive paddle-face hits near the corners.
- `predictive: true` — the AI extrapolates to the intercept point and accounts for **one** reflection off the top/bottom wall. Ball paths with two or more bounces can fool it.

Beating Legend earns the 👑 LEGEND SLAYER badge on the leaderboard. See [leaderboard-queries](../server/leaderboard-queries.md).

## Usage patterns

- **AI mode** — `PongGame` constructor sees `mode.kind === "ai"` and creates a single `AIController(mode.difficulty)` assigned to `aiController` (controls the right paddle).
- **Demo mode** (attract + `/tuning`) — `PongGame` creates **two** controllers: `aiLeftController` (controls left paddle, uses `mode.leftDifficulty`) and `aiController` (right, `mode.rightDifficulty`). Attract hard-codes `pro` vs `expert` for a watchable rally.

The HUD imports `DIFFICULTY_PROFILES` directly for the `"VS <NAME>"` label; the signup screen imports it to render the difficulty cards with names + subtitles.
