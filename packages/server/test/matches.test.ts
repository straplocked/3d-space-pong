import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { setUpTestApp } from "./helpers.js";

describe("POST /api/matches", () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;
  let userId: number;

  beforeAll(async () => {
    ({ app, cleanup } = await setUpTestApp());

    const signup = await app.inject({
      method: "POST",
      url: "/api/signup",
      payload: { displayName: "match_player", email: "match-player@example.com" },
    });
    userId = signup.json().userId;
  });

  afterAll(async () => {
    await cleanup();
  });

  it("records a match result for an existing user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/matches",
      payload: {
        userId,
        difficulty: "pro",
        outcome: "win",
        playerScore: 7,
        aiScore: 4,
        durationMs: 45_000,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.matchId).toBe("number");
  });

  it("404s when the user does not exist", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/matches",
      payload: {
        userId: 999_999,
        difficulty: "rookie",
        outcome: "loss",
        playerScore: 2,
        aiScore: 7,
        durationMs: 30_000,
      },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("User not found");
  });

  it("rejects an invalid difficulty with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/matches",
      payload: {
        userId,
        difficulty: "godmode",
        outcome: "win",
        playerScore: 7,
        aiScore: 0,
        durationMs: 10_000,
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Invalid match result");
  });

  it("rejects a score above the max with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/matches",
      payload: {
        userId,
        difficulty: "amateur",
        outcome: "win",
        playerScore: 999,
        aiScore: 0,
        durationMs: 10_000,
      },
    });
    expect(res.statusCode).toBe(400);
  });
});
