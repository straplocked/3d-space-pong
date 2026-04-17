/**
 * Single source of wit. All player-facing humor copy lives here.
 *
 * Design rules (from plan):
 *   1. Dry over loud — Portal/Stanley-Parable voice, not meme energy.
 *   2. Mock the situation, never the player.
 *   3. Errors stay clear; humor belongs to flavor, not debugging.
 *   4. Tweakable — non-devs can PR jokes here without touching logic.
 *   5. Never lie about game state.
 */

export const quips = {
  lossGeneric: [
    "The ball literally went past you.",
    "Consider a new hobby.",
    "The paddle was right there.",
    "That one's going on the internet.",
    "Legend.exe has filed a noise complaint.",
    "We checked the replay. It's not great.",
    "The ball is round. The paddle is rectangular. We don't know how to make this easier.",
  ],
  lossToRookie: [
    "Rookie would like to take it easy on you. It cannot.",
    "Rookie sends its regards.",
    "You lost to a difficulty literally named Rookie. This is now part of your permanent record.",
    "Rookie: 1. You: existential crisis.",
    "Somewhere, a Legend AI is laughing.",
  ],
  lossToLegend: [
    "Legend was barely awake.",
    "Legend filed this under 'Tuesday.'",
    "You played well. Just not 'beat the source code' well.",
  ],
  winGeneric: [
    "An upset!",
    "The AI is reviewing the tape.",
    "Don't get cocky.",
    "The leaderboard noted your name. Briefly.",
    "Statistically improbable. Logged anyway.",
  ],
  winVsLegend: [
    "...how.",
    "Legend has filed a formal protest.",
    "The source code is embarrassed.",
    "This will be investigated.",
    "Please return the trophy. There's been a mistake.",
  ],
  winVsRookie: [
    "You beat Rookie. Take a moment. Reflect.",
    "Victory! Against a difficulty named Rookie.",
  ],
  loadingTips: [
    "Tip: Press W to move up. Or down. We're honestly not sure anymore.",
    "Tip: The ball is the round one.",
    "Tip: If you're losing, try winning instead.",
    "Tip: The AI can see you sweating.",
    "Tip: There is no Tip.",
  ],
  emptyLeaderboardWins: [
    "Nobody has won yet. The AI is undefeated and frankly insufferable about it.",
  ],
  emptyLeaderboardLosses: [
    "Nobody has lost yet. Someone has to go first.",
  ],
  signupTaglines: [
    "Sign up so the leaderboard knows who to mock.",
    "Sign up to make your defeats permanent.",
  ],
} as const;

export type QuipPool = keyof typeof quips;

/** Pick a random string from a quip pool. */
export function pickQuip(pool: QuipPool): string {
  const arr = quips[pool] as readonly string[];
  if (arr.length === 0) return "";
  const idx = Math.floor(Math.random() * arr.length);
  return arr[idx] ?? "";
}

/**
 * Pick a context-aware quip for a game-over screen.
 * Falls back to generic pools if a specific match doesn't apply.
 */
export function pickGameOverQuip(args: {
  outcome: "win" | "loss";
  difficulty: "rookie" | "amateur" | "pro" | "expert" | "legend";
  vsAI: boolean;
}): string {
  if (!args.vsAI) {
    return args.outcome === "win"
      ? "Victory. Your friend will remember this."
      : "Defeated. By a friend. Even worse, somehow.";
  }
  if (args.outcome === "loss") {
    if (args.difficulty === "rookie") return pickQuip("lossToRookie");
    if (args.difficulty === "legend") return pickQuip("lossToLegend");
    return pickQuip("lossGeneric");
  }
  // Win
  if (args.difficulty === "legend") return pickQuip("winVsLegend");
  if (args.difficulty === "rookie") return pickQuip("winVsRookie");
  return pickQuip("winGeneric");
}

/** Console easter egg printed once on app load. */
export function printConsoleEasterEgg(): void {
  // ASCII pong paddle and ball
  const art = `
   ┌─┐                                                       ┌─┐
   │ │                  ●                                    │ │
   │ │                                                       │ │
   └─┘                                                       └─┘
  `;
  // eslint-disable-next-line no-console
  console.log(
    `%c${art}%c\nI see you found the dev tools. Impressive.\nStill won't help you beat Legend.`,
    "color:#7df9ff;font-family:monospace;font-size:11px",
    "color:#aaa;font-style:italic",
  );
}
