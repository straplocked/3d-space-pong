import { z } from "zod";
import { DIFFICULTIES, OUTCOMES } from "./types.js";

export const DifficultySchema = z.enum(DIFFICULTIES);
export const OutcomeSchema = z.enum(OUTCOMES);

export const SignUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(32, "Name must be 32 characters or fewer")
    .regex(
      /^[a-zA-Z0-9_\-\s.]+$/,
      "Letters, numbers, spaces, dots, dashes, and underscores only",
    ),
  email: z.string().trim().toLowerCase().email("Must be a valid email"),
  marketingConsent: z.boolean().default(false),
});

export type SignUpInput = z.infer<typeof SignUpSchema>;

export const SignUpResponseSchema = z.object({
  userId: z.number().int().positive(),
  displayName: z.string(),
});

export type SignUpResponse = z.infer<typeof SignUpResponseSchema>;

export const MatchResultSchema = z.object({
  userId: z.number().int().positive(),
  difficulty: DifficultySchema,
  outcome: OutcomeSchema,
  playerScore: z.number().int().min(0).max(50),
  aiScore: z.number().int().min(0).max(50),
  durationMs: z.number().int().min(0),
});

export type MatchResultInput = z.infer<typeof MatchResultSchema>;

export const LeaderboardQuerySchema = z.object({
  sort: z
    .enum(["wins", "losses", "ratio", "shortest_loss", "rookie_victims"])
    .default("wins"),
  difficulty: DifficultySchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type LeaderboardQuery = z.infer<typeof LeaderboardQuerySchema>;
