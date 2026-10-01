import { describe, it, expect } from "vitest";
import {
  SignUpSchema,
  MatchResultSchema,
  LeaderboardQuerySchema,
  DifficultySchema,
  OutcomeSchema,
} from "../src/schemas.js";
import { DIFFICULTIES, OUTCOMES } from "../src/types.js";

describe("DifficultySchema / OutcomeSchema", () => {
  it("accepts every declared difficulty", () => {
    for (const d of DIFFICULTIES) {
      expect(DifficultySchema.safeParse(d).success).toBe(true);
    }
  });

  it("rejects an unknown difficulty", () => {
    expect(DifficultySchema.safeParse("godlike").success).toBe(false);
  });

  it("accepts every declared outcome and rejects others", () => {
    for (const o of OUTCOMES) {
      expect(OutcomeSchema.safeParse(o).success).toBe(true);
    }
    expect(OutcomeSchema.safeParse("draw").success).toBe(false);
  });
});

describe("SignUpSchema", () => {
  it("accepts a normal sign-up", () => {
    const parsed = SignUpSchema.safeParse({
      displayName: "space_cadet",
      email: "Cadet@Example.com",
      marketingConsent: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // email is lower-cased and trimmed
      expect(parsed.data.email).toBe("cadet@example.com");
    }
  });

  it("defaults marketingConsent to false when omitted", () => {
    const parsed = SignUpSchema.safeParse({
      displayName: "no_consent",
      email: "no-consent@example.com",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.marketingConsent).toBe(false);
    }
  });

  it("rejects a display name that is too short", () => {
    const parsed = SignUpSchema.safeParse({
      displayName: "a",
      email: "a@example.com",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a display name with disallowed characters", () => {
    const parsed = SignUpSchema.safeParse({
      displayName: "no@symbols!",
      email: "a@example.com",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const parsed = SignUpSchema.safeParse({
      displayName: "valid_name",
      email: "not-an-email",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("MatchResultSchema", () => {
  const base = {
    userId: 1,
    difficulty: "pro" as const,
    outcome: "win" as const,
    playerScore: 7,
    aiScore: 3,
    durationMs: 60_000,
  };

  it("accepts a valid match result", () => {
    expect(MatchResultSchema.safeParse(base).success).toBe(true);
  });

  it("rejects a negative score", () => {
    expect(
      MatchResultSchema.safeParse({ ...base, aiScore: -1 }).success,
    ).toBe(false);
  });

  it("rejects a score above the max", () => {
    expect(
      MatchResultSchema.safeParse({ ...base, playerScore: 51 }).success,
    ).toBe(false);
  });

  it("rejects a non-integer userId", () => {
    expect(
      MatchResultSchema.safeParse({ ...base, userId: 1.5 }).success,
    ).toBe(false);
  });

  it("rejects an unknown difficulty", () => {
    expect(
      MatchResultSchema.safeParse({ ...base, difficulty: "nightmare" })
        .success,
    ).toBe(false);
  });
});

describe("LeaderboardQuerySchema", () => {
  it("defaults sort to 'wins' and limit to 20", () => {
    const parsed = LeaderboardQuerySchema.safeParse({});
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sort).toBe("wins");
      expect(parsed.data.limit).toBe(20);
    }
  });

  it("coerces a string limit to a number", () => {
    const parsed = LeaderboardQuerySchema.safeParse({ limit: "5" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.limit).toBe(5);
    }
  });

  it("rejects an out-of-range limit", () => {
    expect(LeaderboardQuerySchema.safeParse({ limit: "101" }).success).toBe(
      false,
    );
    expect(LeaderboardQuerySchema.safeParse({ limit: "0" }).success).toBe(
      false,
    );
  });

  it("rejects an unknown sort value", () => {
    expect(
      LeaderboardQuerySchema.safeParse({ sort: "mostFun" }).success,
    ).toBe(false);
  });

  it("accepts every declared sort mode", () => {
    for (const sort of [
      "wins",
      "losses",
      "ratio",
      "shortest_loss",
      "rookie_victims",
    ]) {
      expect(LeaderboardQuerySchema.safeParse({ sort }).success).toBe(true);
    }
  });
});
