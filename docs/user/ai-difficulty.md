# AI difficulty

Five levels. They are who you think they are.

| Level | Name | Subtitle | What to expect |
| --- | --- | --- | --- |
| 1 | **Rookie** | Has never held a paddle before | Slow reaction (0.35 s delay), slow paddle, large random error. Losing to Rookie earns you a permanent 🙈 ROOKIE VICTIM badge on the leaderboard. Probably start here. |
| 2 | **Amateur** | Practiced for a weekend, feels unstoppable | Faster reactions, less random error, but still chases the ball's current position without predicting. Beatable with reasonable paddle control. |
| 3 | **Pro** | Makes eye contact with you through the screen | Fast reactions (0.12 s), accurate, but still reactive — you can still beat it with good angle play off the paddle face. |
| 4 | **Expert** | Has read your source code | Very fast and very accurate. Still reactive (not predictive). Wins reliably unless you use paddle-face angle manipulation. |
| 5 | **Legend** | Is the source code | Predictive — extrapolates the ball's intercept point from its current velocity, accounts for one wall bounce, reacts every 20 ms. Near-zero random error. Beating Legend earns you the rare 👑 LEGEND SLAYER badge. |

## How to read a subtitle

The subtitle is the whole flavor of the opponent. They appear on the difficulty cards when you pick, and on the in-game HUD during the match. They're not cosmetic — the behavior matches.

## Why losing to Rookie earns a badge

Because it should. The leaderboard calls out Rookie losses specifically with the 🙈 ROOKIE VICTIM badge. It is not temporary. It is not removable by future wins. It's a permanent footnote that you did, at least once, lose to a difficulty that is explicitly described as having never held a paddle before.

Once is enough. You cannot pay to have it removed.

## Paddle-angle strategy

All five levels respect the same physics: where the ball hits your paddle determines the bounce angle (up to ±60° off horizontal). The AIs read the **ball's trajectory**, not your paddle position — so hitting the ball with the top or bottom edge of your paddle, rather than the middle, fires it at an angle the AI may not have time to cover. This works against everyone, including Legend — just increasingly less.

## What the numbers are actually doing (short version)

- **Reaction delay** — how often the AI can change its target position. Lower = tracks the ball more tightly. Ranges from 0.35 s (Rookie) to 0.02 s (Legend).
- **Max paddle speed** — fraction of arena width per second. Rookie is half-speed; Legend is full-speed.
- **Tracking error** — a random offset added to the target every reaction tick. Rookie has ±25% of the arena half-height of noise; Legend has none.
- **Predictive** — whether the AI extrapolates to the intercept point (Legend only) or just chases the current ball Y (everyone else).

Exact numbers: [../technical/web/ai.md](../technical/web/ai.md).
