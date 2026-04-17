export const DIFFICULTIES = [
  "rookie",
  "amateur",
  "pro",
  "expert",
  "legend",
] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

export const OUTCOMES = ["win", "loss"] as const;
export type Outcome = (typeof OUTCOMES)[number];

export type LeaderboardSort =
  | "wins"
  | "losses"
  | "ratio"
  | "shortest_loss"
  | "rookie_victims";

export interface LeaderboardRow {
  userId: number;
  displayName: string;
  wins: number;
  losses: number;
  totalGames: number;
  ratio: number | null;
  shortestLossMs: number | null;
  lostToRookie: boolean;
  beatLegend: boolean;
}
