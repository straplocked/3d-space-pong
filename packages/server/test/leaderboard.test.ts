import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { setUpTestApp } from "./helpers.js";

async function signup(app: FastifyInstance, displayName: string, email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/api/signup",
    payload: { displayName, email },
  });
  return res.json().userId as number;
}

async function recordMatch(
  app: FastifyInstance,
  userId: number,
  outcome: "win" | "loss",
) {
  await app.inject({
    method: "POST",
    url: "/api/matches",
    payload: {
      userId,
      difficulty: "pro",
      outcome,
      playerScore: outcome === "win" ? 7 : 2,
      aiScore: outcome === "win" ? 2 : 7,
      durationMs: 60_000,
    },
  });
}

describe("GET /api/leaderboard", () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    ({ app, cleanup } = await setUpTestApp());

    // ace: 3 wins, 0 losses
    const ace = await signup(app, "ace_player", "ace@example.com");
    await recordMatch(app, ace, "win");
    await recordMatch(app, ace, "win");
    await recordMatch(app, ace, "win");

    // mid: 1 win, 2 losses
    const mid = await signup(app, "mid_player", "mid@example.com");
    await recordMatch(app, mid, "win");
    await recordMatch(app, mid, "loss");
    await recordMatch(app, mid, "loss");

    // scrub: 0 wins, 5 losses
    const scrub = await signup(app, "scrub_player", "scrub@example.com");
    for (let i = 0; i < 5; i++) await recordMatch(app, scrub, "loss");
  });

  afterAll(async () => {
    await cleanup();
  });

  it("sort=wins orders by wins desc", async () => {
    const res = await app.inject({ method: "GET", url: "/api/leaderboard?sort=wins" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sort).toBe("wins");
    const names = body.leaderboard.map((r: { displayName: string }) => r.displayName);
    expect(names).toEqual(["ace_player", "mid_player", "scrub_player"]);
    expect(body.leaderboard[0].wins).toBe(3);
    expect(body.leaderboard[0].losses).toBe(0);
  });

  it("sort=losses orders by losses desc", async () => {
    const res = await app.inject({ method: "GET", url: "/api/leaderboard?sort=losses" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.sort).toBe("losses");
    const names = body.leaderboard.map((r: { displayName: string }) => r.displayName);
    expect(names).toEqual(["scrub_player", "mid_player", "ace_player"]);
    expect(body.leaderboard[0].losses).toBe(5);
  });

  it("respects the limit parameter", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/leaderboard?sort=wins&limit=1",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().leaderboard).toHaveLength(1);
  });

  it("rejects an unknown sort value with a 400", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/leaderboard?sort=mostFun",
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("Invalid query");
  });

  it("rejects an out-of-range limit with a 400", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/leaderboard?limit=0",
    });
    expect(res.statusCode).toBe(400);
  });
});
