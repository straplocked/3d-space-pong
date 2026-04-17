# Game modes

## Fight The Machine — 1P vs AI

One human (left paddle) vs one AI (right paddle). Five difficulty levels — see [AI difficulty](./ai-difficulty.md).

- Requires signup (display name + email — kept per-device in your browser).
- Match results are recorded: wins, losses, duration, difficulty.
- First to **7 points** wins.
- Quitting mid-match via the pause menu discards the match.
- Controls: `W` / `S` on keyboard, or drag on touchscreen.

## Betray a Friend — 2P local

Two humans, one keyboard. No signup, no recording, no leaderboard — just bragging rights.

- Player 1 (left): `W` / `S`
- Player 2 (right): `↑` / `↓`
- First to **7 points** wins.

## Attract mode

Not a mode you "play" — it runs itself. Three looping phases:
1. **Title** (5 s) — big logo, "PRESS ANY KEY TO START".
2. **Demo** (15 s) — AI (`Pro`) vs AI (`Expert`). Endless rally — scores reset when either side reaches 7.
3. **Hall of Shame** (10 s) — slow-scrolling leaderboard of the current top losers.

Any input (key, click, tap) dismisses attract mode and drops you at the main menu. If you idle for 60 s on any non-gameplay screen, attract mode comes back automatically.

## GFX Tuning

A side mode accessible from the main menu. Runs an AI-vs-AI demo match (endless rally) while a dev panel exposes sliders for:
- Bloom strength / radius / threshold
- Tone exposure
- Key light / ambient / shadow opacity
- Paddle glow / ball glow
- Fog density
- Dust size / opacity
- Star size / opacity
- Stage glow

Changes are **live** — you see them as you drag. Settings persist across sessions via browser storage, and subsequently **apply to real matches too**. If you push something too far, hit **RESET DEFAULTS**.

The **EXPORT TO CODE** button copies the current values as a `defaultGfx()` function body to your clipboard — if you're working on the game, you can paste those into the source.

Press the backtick (`) key to toggle the panel's visibility.
