# The leaderboards (Hall of Fame and Hall of Shame)

Everyone's 1P-vs-AI match history in one place, in two flavors.

## What you see

The leaderboard screen has two tabs:

| Tab | Sorted by | What it celebrates |
| --- | --- | --- |
| 🏆 **Hall of Fame** | Wins, descending | Who's beating the machine the most. |
| 💀 **Hall of Shame** | Losses, descending | Who's losing to the machine the most. |

Columns differ slightly by tab, but both share rank, player, and total W/L:

| Column | Hall of Fame | Hall of Shame |
| --- | --- | --- |
| `#` | Rank by wins | Rank by losses |
| `PLAYER` | Your display name, plus any badges | Same |
| `WINS` / `LOSSES` | Total wins across all difficulties | Total losses across all difficulties |
| `W/L RATIO` / `FASTEST L` | Wins ÷ losses, 2 decimal places (`—` if you've never won) | Shortest single match that ended in a loss, in seconds (active play time only — paused time doesn't count) |
| `W / L` | Total wins / losses | Same |

Opening the leaderboard from the main menu lands on the Hall of Shame by default (it's the screen's historical home). Finishing a match and tapping **View Leaderboard** on the game-over screen takes you to whichever tab matches what just happened — Fame after a win, Shame after a loss. Tap the other tab any time to switch; it re-fetches the opposite sort live.

## Badges

| Badge | Meaning |
| --- | --- |
| 🙈 **ROOKIE VICTIM** | You've lost at least one match at `Rookie` difficulty. Permanent. |
| 👑 **LEGEND SLAYER** | You've won at least one match at `Legend` difficulty. Rare. |

Badges show on **both** tabs and are computed across your entire match history, regardless of which tab (or difficulty filter, where the API supports one) the current view happens to use. If you ever lost to Rookie, the badge is always on — no matter how many Legend wins you subsequently rack up. A player can proudly show 👑 LEGEND SLAYER on the Hall of Fame tab while also carrying 🙈 ROOKIE VICTIM — the game keeps receipts for both.

## Empty leaderboards

Freshly seeded installs come pre-populated with ~27 fictional losers (a few of whom also have some wins) so both tabs have content from day one. If someone did nuke the database, an empty Hall of Shame would show "Nobody has lost yet. Someone has to go first," and an empty Hall of Fame would show "Nobody has won yet. The AI is undefeated and frankly insufferable about it."

## Seeded characters

Any name that looks like `keyboard_warrior`, `hands_of_clay`, `buttermitts`, `afk_alice` etc. is a fictional seed entry. They hold the fort until real humans arrive. They cannot be offended. Their scores are fixed at seed time and don't change.

## What counts as a "match"

Only matches that **finish naturally** at 7 points in **1P-vs-AI mode**. Specifically:

| Scenario | Recorded? |
| --- | --- |
| You won 7–5 vs Pro | ✅ Yes — recorded as a win, counts toward Hall of Fame. |
| You lost 3–7 vs Rookie | ✅ Yes — recorded as a loss, counts toward Hall of Shame. |
| You hit **Quit to Menu** at 4–4 | ❌ Not recorded. |
| You closed the tab at 6–6 | ❌ Not recorded (never reached the server). |
| 2P local match | ❌ Not recorded. |
| Attract mode / GFX tuning demo | ❌ Not recorded. |

Pausing does not count against you — pause time is excluded from the match duration.

## Other sort modes (future UI)

The server also supports sorting by win/loss ratio, shortest loss, and "rookie victims only" — see [../technical/server/api-reference.md](../technical/server/api-reference.md). Only wins (Fame) and losses (Shame) are exposed as tabs today; the other three are a UI change away.

## How sign-ups relate

Your sign-up (display name + email) is what links your matches to your entry. The email is the unique key on your account — signing up with the same email from a different device will update the existing entry, not create a new one. Changing your display name on re-signup updates it on all past and future entries.
