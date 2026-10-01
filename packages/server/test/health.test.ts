import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { setUpTestApp } from "./helpers.js";

describe("GET /api/health", () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    ({ app, cleanup } = await setUpTestApp());
  });

  afterAll(async () => {
    await cleanup();
  });

  it("returns 200 with ok status", async () => {
    const res = await app.inject({ method: "GET", url: "/api/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", vibes: "immaculate" });
  });
});
