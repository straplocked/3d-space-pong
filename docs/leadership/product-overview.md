# Product overview

## What the player experiences

### First visit
Landing page is **attract mode** — a looping three-phase arcade demo (title → AI-vs-AI demo match → Hall of Shame scroll). Any input breaks out into the main menu.

### Main menu
Four actions plus an audio toggle:
- **Fight The Machine** — 1P vs AI, five difficulty levels.
- **Betray a Friend** — 2P local couch play, no signup.
- **Hall of Shame** — view the leaderboard.
- **GFX Tuning** — expose a live dev panel over an AI-vs-AI demo so anyone can tune the look.

### First match
A one-time sign-up (display name + email) links the player to a persistent record. From then on, every match they finish against the AI is recorded: win, loss, duration, difficulty. Quitting mid-match via pause discards it — only completed matches count.

## The five AI levels

| Level | Voice | Numerical character |
| --- | --- | --- |
| Rookie | "Has never held a paddle before" | Slow, sloppy, random. Losing to Rookie is notable. |
| Amateur | "Practiced for a weekend, feels unstoppable" | Moderate. |
| Pro | "Makes eye contact with you through the screen" | Sharp but reactive. |
| Expert | "Has read your source code" | Very hard to beat without paddle-angle exploitation. |
| Legend | "Is the source code" | Predicts the ball's trajectory and one wall bounce. Beating Legend earns the 👑 LEGEND SLAYER badge. |

## Humor as a first-class feature

All player-facing flavor text — loss messages, win messages, loading tips, leaderboard taglines — lives in one file: [`packages/web/src/content/quips.ts`](../../packages/web/src/content/quips.ts). Non-developers can contribute jokes via PR. The file carries five voice rules at the top:

1. Dry over loud.
2. Mock the situation, never the player.
3. Errors stay clear.
4. Tweakable by non-devs.
5. Never lie about game state.

Errors are deliberately *not* made funny. A failed network request says "Couldn't reach the server." The humor stays in the flavor layer; the functional layer is plain.

## Persistence model

- **Server side:** one SQLite database with two tables (`users`, `matches`). Single file at `/app/data/pong.db` (bind-mount). WAL journaling for concurrency and crash safety.
- **Client side:** `localStorage` holds (a) the signed-in user's `{ userId, displayName }`, (b) graphics-panel settings, (c) audio on/off state.
- **First boot:** the Hall of Shame seeder pre-populates the leaderboard with ~27 fictional losers so the UI has content on day one and attract mode has something to show.

## Attract / idle-to-attract loop

Designed to feel like an arcade cabinet. If the user sits on a menu without interacting for 60 seconds, the app navigates to attract mode automatically. On touch devices where you can't always "leave the tab open," this matters less — but on a screen running the game for ambient play (e.g., in a kiosk or on a self-hosted dashboard), it turns the browser tab into a low-attention demo loop that restarts itself.

## Leaderboard semantics

The server supports five sort modes — wins, losses, win/loss ratio, shortest loss, and "rookie victims only." The current UI exposes the losses view (Hall of Shame) only. Badges for **ROOKIE VICTIM** and **LEGEND SLAYER** are computed server-side from the unfiltered match history, so filtering doesn't hide them.

See [../user/leaderboard-guide.md](../user/leaderboard-guide.md) for the player-facing write-up, and [../technical/server/leaderboard-queries.md](../technical/server/leaderboard-queries.md) for the SQL.

## Mobile experience

- `isTouchDevice()` branching adjusts renderer DPR, antialiasing, shadow map resolution, bloom pass resolution, and particle counts so phones sustain high frame rates.
- Landscape is enforced on every screen for phones: an opaque rotate overlay in portrait, plus a real landscape lock where the browser allows it (Android fullscreen, installed app). iOS Safari relies on the overlay.
- Matches auto-pause on app switch, rotation to portrait, or GPU context loss; the screen is kept awake during play; paused frames aren't re-rendered, saving battery.
- In-app **INSTALL** button (Android/Chrome prompt, iOS "Add to Home Screen" hint) and an offline badge that tells players 2P local still works.
- Smaller first load: the 3D engine downloads in the background after the menu appears (~104 kB initial JS vs ~614 kB before).
- If the 3D engine can't start (no WebGL, offline before first load), players get a plain error screen with Reload / Back to Menu instead of a frozen game.
- Touch controls are direct manipulation, not virtual buttons. Fast drag = fast paddle.
