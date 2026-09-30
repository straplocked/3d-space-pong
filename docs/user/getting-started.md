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

Plus a **SOUND: ON / OFF** toggle, a **FULLSCREEN** toggle, and (when your browser supports installing) an **INSTALL** button in the corner. Sound is remembered between sessions. The fullscreen button hides itself if your browser doesn't support the Fullscreen API, or if you've already installed the game as an app (see below) — there's no browser chrome to hide in that case. The install button also disappears once the game is installed.

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

The game is landscape-only on phones and tablets. Whenever you hold the device in portrait — on any screen, not just during a match — a **Rotate to Landscape** screen covers the app until you turn it sideways.

- **Android, in a browser tab:** the rotate screen has a **GO FULLSCREEN** button that goes fullscreen and locks the screen to landscape for you.
- **Installed as an app:** the game locks itself to landscape on your first tap.
- **iPhone / iPad:** Safari can't lock orientation, so you'll need to rotate yourself.

Starting a match also requests fullscreen + landscape, and you can trigger fullscreen manually any time from the **FULLSCREEN** button on the main menu.

During a match on mobile:
- **Auto-pause** — if you switch apps, lock the phone, or turn it to portrait, the match pauses itself so you don't come back to a point already lost. Rotate back and tap **Resume**.
- **Screen stays awake** — the screen won't dim or lock mid-rally (on browsers that support it).
- **Controls hint** — a short "drag to move" reminder appears at the bottom and fades out after a few seconds.
- The moving background is held still during a match so it doesn't distract, and resumes afterward.

If the game can't start — for example your browser can't run 3D graphics, or you're offline before the game has ever been loaded — you'll see a **Can't Start Game** screen explaining why, with **Reload** and **Back to Menu** buttons.

Touch controls:
- **1P vs AI** — drag anywhere on the arena to move your paddle. Your finger Y controls the paddle directly — no virtual joystick.
- **2P local** — each half of the screen is its own paddle: drag the left half for player 1, the right half for player 2. Both thumbs can be down at once.

### Installing as an app

The site is an installable Progressive Web App. The easiest way is the **INSTALL** button on the main menu: on Android / desktop Chrome it opens the install prompt directly; on iPhone / iPad it shows a short hint (tap Safari's **Share** button, then **"Add to Home Screen"**). You can also use your browser's own menu — **"Add to Home Screen"** (iOS Safari) or **"Install app"** (Android Chrome). Once installed, it opens fullscreen with its own icon — no address bar, no browser chrome — and the local game modes (menu, 2P local, GFX tuning, attract mode) keep working even offline, since the app shell is cached on install. Signing up, recording AI matches, and the leaderboard still need a network connection, since those talk to the server's `/api/*` routes. While you're offline, a small **OFFLINE · 2P local still works** badge appears so you know which modes are available.

The first screen loads quickly because the 3D engine downloads in the background after the menu appears; by the time you tap to play it's usually already there.

## What gets recorded

- **1P vs AI matches that finish naturally** → result is posted to the leaderboard (win or loss, score, duration, difficulty).
- **1P vs AI matches that you quit** → nothing recorded.
- **2P local matches** → never recorded.

See [leaderboard guide](./leaderboard-guide.md) for what happens with those records.
