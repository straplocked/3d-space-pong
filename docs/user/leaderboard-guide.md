# The leaderboard (a.k.a. the Hall of Shame)

Everyone's 1P-vs-AI match history in one place.

## What you see

The default view is sorted by **losses, descending** — the Hall of Shame. Columns:

| Column | Meaning |
| --- | --- |
| `#` | Rank. |
| `PLAYER` | Your display name. Plus any badges. |
| `LOSSES` | Total losses across all difficulties. |
| `FASTEST L` | Shortest single match that ended in a loss, in seconds. Includes only active play time (paused time doesn't count). |
| `W / L` | Total wins / losses. |

## Badges

| Badge | Meaning |
| --- | --- |
| 🙈 **ROOKIE VICTIM** | You've lost at least one match at `Rookie` difficulty. Permanent. |
| 👑 **LEGEND SLAYER** | You've won at least one match at `Legend` difficulty. Rare. |

Badges are computed across your **entire** match history, regardless of which difficulty filter the current view happens to use. If you ever lost to Rookie, the badge is always on — no matter how many Legend wins you subsequently rack up.

## Empty leaderboard

Freshly seeded installs come pre-populated with ~27 fictional losers so the leaderboard has content from day one. If someone did nuke the database, an empty Hall of Shame would show "Nobody has lost yet. Someone has to go first."

## Seeded characters

Any name that looks like `keyboard_warrior`, `hands_of_clay`, `buttermitts`, `afk_alice` etc. is a fictional seed entry. They hold the fort until real humans arrive. They cannot be offended. Their scores are fixed at seed time and don't change.

## What counts as a "match"

Only matches that **finish naturally** at 7 points in **1P-vs-AI mode**. Specifically:

| Scenario | Recorded? |
| --- | --- |
| You won 7–5 vs Pro | ✅ Yes — recorded as a win. |
| You lost 3–7 vs Rookie | ✅ Yes — recorded as a loss. |
| You hit **Quit to Menu** at 4–4 | ❌ Not recorded. |
| You closed the tab at 6–6 | ❌ Not recorded (never reached the server). |
| 2P local match | ❌ Not recorded. |
| Attract mode / GFX tuning demo | ❌ Not recorded. |

Pausing does not count against you — pause time is excluded from the match duration.

## Other sort modes (future UI)

The server already supports sorting by wins, win/loss ratio, shortest loss, and "rookie victims only" — see [../technical/server/api-reference.md](../technical/server/api-reference.md). The current UI only exposes the losses view; other sorts are a UI change away.

## How sign-ups relate

Your sign-up (display name + email) is what links your matches to your entry. The email is the unique key on your account — signing up with the same email from a different device will update the existing entry, not create a new one. Changing your display name on re-signup updates it on all past and future entries.
