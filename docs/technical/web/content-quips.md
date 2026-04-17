# Content — quips and voice

All player-facing humor lives in one file so non-developers can PR jokes without touching any game logic.

Source: [packages/web/src/content/quips.ts](../../../packages/web/src/content/quips.ts).

## Design rules (in the source)

Quoted verbatim from the file header:

1. **Dry over loud** — Portal/Stanley-Parable voice, not meme energy.
2. **Mock the situation, never the player.** The app is self-aware, not mean.
3. **Errors stay clear.** Network errors are plain English; humor lives in flavor only.
4. **Tweakable** — non-devs can PR jokes here without touching game logic.
5. **Never lie about game state.** Score is score. Flavor is flavor.

## Quip pools

Exported as the `quips` const. Each pool is a readonly array of strings.

| Pool | Used by |
| --- | --- |
| `lossGeneric` | Fallback loss quip for non-rookie, non-legend difficulties. |
| `lossToRookie` | Loss at `difficulty=rookie` — maximum roast. |
| `lossToLegend` | Loss at `difficulty=legend` — mild, because losing to Legend is expected. |
| `winGeneric` | Win at `amateur` / `pro` / `expert`. |
| `winVsLegend` | Win at `difficulty=legend` — disbelief. |
| `winVsRookie` | Win at `difficulty=rookie` — faint praise. |
| `loadingTips` | Reserved (not currently displayed). |
| `emptyLeaderboardWins` | Shown on an empty wins-leaderboard (currently unused; kept for future sort modes). |
| `emptyLeaderboardLosses` | Shown by [ui/leaderboard.ts](../../../packages/web/src/ui/leaderboard.ts) and [ui/attract.ts](../../../packages/web/src/ui/attract.ts) when no rows are returned. |
| `signupTaglines` | Reserved. |

## Helpers

### `pickQuip(pool: QuipPool): string`
Uniformly random element from `quips[pool]`. Returns `""` if the pool is empty.

### `pickGameOverQuip({ outcome, difficulty, vsAI }): string`
Used by [ui/gameOver.ts](../../../packages/web/src/ui/gameOver.ts).

Dispatch table:
```
vsAI=false → outcome="win"  → "Victory. Your friend will remember this."
             outcome="loss" → "Defeated. By a friend. Even worse, somehow."

vsAI=true, outcome="loss":
  difficulty="rookie"  → lossToRookie
  difficulty="legend"  → lossToLegend
  else                 → lossGeneric

vsAI=true, outcome="win":
  difficulty="legend"  → winVsLegend
  difficulty="rookie"  → winVsRookie
  else                 → winGeneric
```

### `printConsoleEasterEgg(): void`
Called once on boot by [main.ts](../../../packages/web/src/main.ts). Prints an ASCII paddle+ball + `"I see you found the dev tools. Impressive. Still won't help you beat Legend."` in cyan monospace + italic gray to the browser console.

## Adding a quip

1. Decide which pool it belongs in (check the pools table above).
2. Open [packages/web/src/content/quips.ts](../../../packages/web/src/content/quips.ts) and append to the array.
3. Typecheck (`pnpm typecheck`) — because `quips` is `as const`, new strings are just additions, no types to update.
4. Open a PR.

Because `QuipPool` is derived via `keyof typeof quips`, adding a **new pool** is also typesafe — and any code that switches on pool will need a new case.

## Error messages are not quips

Anything user-facing that describes a failure state (network error, validation error, missing user) lives in the UI files, not here. Quips are flavor. If a network error appears, it should be a plain "Couldn't reach the server" in the UI, not a joke — see design rule 3.
