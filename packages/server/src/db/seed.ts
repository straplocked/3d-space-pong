/**
 * Hall of Shame seeder.
 * Populates the matches table with a rich cast of fictional losers on
 * first boot (when the table is empty). This gives the leaderboard —
 * and especially the attract-mode demo — real content from the start,
 * and establishes the tone before any humans show up.
 *
 * Runs idempotently: if any matches already exist, this is a no-op.
 */
import { sql } from "drizzle-orm";
import { db } from "./client.js";
import { matches, users } from "./schema.js";
import type { NewMatch } from "./schema.js";

type Difficulty = "rookie" | "amateur" | "pro" | "expert" | "legend";
const ALL_DIFFICULTIES: Difficulty[] = [
  "rookie",
  "amateur",
  "pro",
  "expert",
  "legend",
];

/**
 * Seed cast. Each entry defines a fake user's permanent record. The
 * numbers are intentionally lopsided toward losses — this is a Hall of
 * Shame, after all. A handful of entries include a `legendWins` count
 * for the rare Legend Slayer badge.
 */
interface SeedUser {
  displayName: string;
  email: string;
  /** Total losses split roughly evenly across difficulties unless noted. */
  losses: number;
  /** Optional — number of wins (all non-legend). */
  wins?: number;
  /** Optional — number of legend wins (rare, earns Legend Slayer badge). */
  legendWins?: number;
  /** Optional — number of rookie losses (earns Rookie Victim badge). */
  rookieLosses?: number;
  /** Optional — force at least one extremely fast loss for "fastest L" flavor. */
  fastestLossMs?: number;
}

const CAST: SeedUser[] = [
  { displayName: "keyboard_warrior", email: "keyboard_warrior@pong.local", losses: 42, wins: 3, rookieLosses: 5 },
  { displayName: "hands_of_clay", email: "clay@pong.local", losses: 31, rookieLosses: 8, fastestLossMs: 9200 },
  { displayName: "jittery_mcspasm", email: "jitters@pong.local", losses: 27, wins: 1, rookieLosses: 4 },
  { displayName: "paddle_pacifist", email: "peace@pong.local", losses: 24, rookieLosses: 6 },
  { displayName: "the_optimist", email: "optimist@pong.local", losses: 22, wins: 2, legendWins: 1 },
  { displayName: "misclick_mike", email: "mike@pong.local", losses: 21, rookieLosses: 3, fastestLossMs: 7400 },
  { displayName: "late_to_the_ball", email: "late@pong.local", losses: 19, rookieLosses: 5 },
  { displayName: "phantom_paddle", email: "phantom@pong.local", losses: 18, wins: 1 },
  { displayName: "confused_cat", email: "cat@pong.local", losses: 17, rookieLosses: 4, fastestLossMs: 11200 },
  { displayName: "doomscroll_dave", email: "dave@pong.local", losses: 16 },
  { displayName: "wrong_way_wendy", email: "wendy@pong.local", losses: 15, rookieLosses: 3 },
  { displayName: "bouncing_bob", email: "bob@pong.local", losses: 14, wins: 2 },
  { displayName: "nearlymiss_nancy", email: "nancy@pong.local", losses: 14, wins: 3 },
  { displayName: "the_trainee", email: "trainee@pong.local", losses: 13, rookieLosses: 6 },
  { displayName: "buttermitts", email: "butter@pong.local", losses: 12, rookieLosses: 2, fastestLossMs: 8800 },
  { displayName: "afk_alice", email: "alice@pong.local", losses: 12, fastestLossMs: 4200 },
  { displayName: "laggy_larry", email: "larry@pong.local", losses: 11, wins: 1, legendWins: 1 },
  { displayName: "sleepy_sam", email: "sam@pong.local", losses: 11, rookieLosses: 2 },
  { displayName: "twitchy_tim", email: "tim@pong.local", losses: 10, wins: 2 },
  { displayName: "net_loss_ned", email: "ned@pong.local", losses: 10, rookieLosses: 3 },
  { displayName: "perpetual_loser", email: "perp@pong.local", losses: 9, rookieLosses: 4 },
  { displayName: "glitchy_gary", email: "gary@pong.local", losses: 9, wins: 1 },
  { displayName: "two_seconds_late", email: "twosec@pong.local", losses: 8, fastestLossMs: 6100 },
  { displayName: "snacking_sid", email: "sid@pong.local", losses: 8, rookieLosses: 2 },
  { displayName: "cold_hands_clem", email: "clem@pong.local", losses: 7, wins: 1 },
  { displayName: "reaction_time_rhonda", email: "rhonda@pong.local", losses: 7, rookieLosses: 3 },
  { displayName: "the_rebound_kid", email: "rebound@pong.local", losses: 6, wins: 2, legendWins: 1 },
];

function pickDifficulty(): Difficulty {
  // Weighted toward the middle so the histogram feels natural.
  const weights: Array<[Difficulty, number]> = [
    ["rookie", 1],
    ["amateur", 3],
    ["pro", 4],
    ["expert", 3],
    ["legend", 1],
  ];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [d, w] of weights) {
    r -= w;
    if (r <= 0) return d;
  }
  return "pro";
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomLossDuration(): number {
  // Most losses are 40s–3min; a few longer.
  if (Math.random() < 0.1) return randInt(180000, 320000);
  return randInt(40000, 180000);
}

function randomWinDuration(): number {
  // Wins tend to be longer matches — the human was trying.
  return randInt(90000, 250000);
}

/**
 * Spread a count of losses across difficulties with a rough weighted
 * distribution. Returns the generated match rows (without userId — caller
 * sets that so we can do one bulk insert per user).
 */
function buildMatches(spec: SeedUser, userId: number): NewMatch[] {
  const rows: NewMatch[] = [];

  // Start from some reasonable point in the past so playedAt spreads out.
  const spanDays = 45;
  const spanMs = spanDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const pushMatch = (
    outcome: "win" | "loss",
    difficulty: Difficulty,
    duration: number,
  ) => {
    const aiScore = outcome === "win" ? randInt(0, 5) : 7;
    const playerScore = outcome === "win" ? 7 : randInt(0, 5);
    const playedAtMs = now - Math.floor(Math.random() * spanMs);
    rows.push({
      userId,
      difficulty,
      outcome,
      playerScore,
      aiScore,
      durationMs: duration,
      playedAt: new Date(playedAtMs),
    });
  };

  // Forced rookie losses (earns the badge).
  const rookieLosses = spec.rookieLosses ?? 0;
  for (let i = 0; i < rookieLosses; i++) {
    pushMatch("loss", "rookie", randomLossDuration());
  }

  // One extra-fast loss if requested (populates the "fastest L" stat).
  if (spec.fastestLossMs !== undefined) {
    pushMatch("loss", pickDifficulty(), spec.fastestLossMs);
  }

  // Remaining losses across weighted difficulties.
  const remaining = Math.max(
    0,
    spec.losses - rookieLosses - (spec.fastestLossMs !== undefined ? 1 : 0),
  );
  for (let i = 0; i < remaining; i++) {
    pushMatch("loss", pickDifficulty(), randomLossDuration());
  }

  // Forced legend wins (earns the Legend Slayer badge).
  const legendWins = spec.legendWins ?? 0;
  for (let i = 0; i < legendWins; i++) {
    pushMatch("win", "legend", randomWinDuration());
  }

  // Additional wins against easier difficulties.
  const otherWins = Math.max(0, (spec.wins ?? 0) - 0); // wins is already non-legend count
  for (let i = 0; i < otherWins; i++) {
    const d = pickDifficulty();
    pushMatch("win", d === "legend" ? "expert" : d, randomWinDuration());
  }

  return rows;
}

export function seedIfEmpty(): void {
  const row = db
    .select({ c: sql<number>`count(*)` })
    .from(matches)
    .get();
  const existing = row?.c ?? 0;
  if (existing > 0) return;

  console.log(
    `[seed] matches table is empty — populating Hall of Shame with ${CAST.length} fictional losers...`,
  );

  db.transaction((tx) => {
    for (const spec of CAST) {
      // Upsert by email in case the user already exists from an earlier seed
      // that was interrupted.
      const existingUser = tx
        .select({ id: users.id })
        .from(users)
        .where(sql`${users.email} = ${spec.email}`)
        .get();

      let userId: number;
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const inserted = tx
          .insert(users)
          .values({
            displayName: spec.displayName,
            email: spec.email,
            marketingConsent: false,
          })
          .returning({ id: users.id })
          .get();
        if (!inserted) continue;
        userId = inserted.id;
      }

      const rows = buildMatches(spec, userId);
      if (rows.length > 0) {
        tx.insert(matches).values(rows).run();
      }
    }
  });

  console.log("[seed] Hall of Shame seeded.");
}
