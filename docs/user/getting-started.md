# Getting started

## Requirements

- A modern browser with WebGL (Chrome, Firefox, Safari, Edge — all current versions).
- A keyboard **or** a touchscreen.
- Audio is optional — the game is fully playable muted.

## First time you open the site

You'll land on the **attract mode** loop: title card → AI-vs-AI demo match → Hall of Shame scroll. It repeats until you press a key, tap the screen, or click. Any of those drops you at the main menu.

If you walk away for 60 seconds on any menu screen, attract mode comes back. That's by design — it's an arcade.

## The main menu

Four actions:
| Button | What it does |
| --- | --- |
| **Fight The Machine** | 1P vs AI. Sends you to signup (first time) or straight to the difficulty picker (returning). |
| **Betray a Friend** | 2P local. Both paddles, one keyboard, no signup required. |
| **Hall of Shame** | Shows the leaderboard — everyone's losses against the AI. |
| **GFX Tuning** | Fine-tune bloom, lighting, fog, etc. while an AI-vs-AI match rolls. |
| **Attract Mode** | Jump back to the demo loop manually. |

Plus a **SOUND: ON / OFF** toggle in the corner. Your choice is remembered between sessions.

## Signing up (1P vs AI only)

You provide:
- A **display name** — 2–32 characters, letters/digits/spaces/dots/dashes/underscores. This appears on the leaderboard.
- An **email** — used as the unique key on your account. We don't send marketing by default.
- A **marketing consent** checkbox — off by default. If you check it, we may email you "occasional existential paddle advice." That is not a euphemism.

If your display name is already taken, pick another — the server will say so plainly.

Once signed up, you're remembered on this device via local browser storage. You won't need to sign up again unless you clear your browser data.

## Playing your first match

1. After signup, the difficulty picker appears. Start with **Rookie** unless you enjoy humiliation.
2. The arena is a 3D region of space — there's no floor; paddle and ball shadows fall onto an invisible plane so you can still read vertical position.
3. First to **7 points** wins.
4. Press **Escape** (or tap the pause button in the corner) any time to pause. Options: Resume, or Quit to Menu. Quitting mid-match does **not** record a loss — the match is discarded.
5. When the match ends, you'll see **VICTORY** or **DEFEAT** with a final score and a quip. Buttons: **Play Again**, **Back to Menu**, and (AI mode only) **View Leaderboard**.

## On mobile

The game requests fullscreen + landscape orientation on mobile devices. If your phone is portrait, you'll see a rotate-to-landscape prompt. iOS Safari can't lock orientation programmatically, so you'll need to rotate yourself.

Touch controls: drag anywhere on the arena to move your paddle. Your finger Y controls the paddle directly — no virtual joystick.

## What gets recorded

- **1P vs AI matches that finish naturally** → result is posted to the leaderboard (win or loss, score, duration, difficulty).
- **1P vs AI matches that you quit** → nothing recorded.
- **2P local matches** → never recorded.

See [leaderboard guide](./leaderboard-guide.md) for what happens with those records.
