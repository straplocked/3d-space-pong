import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { setUpTestApp } from "./helpers.js";

describe("POST /api/signup", () => {
  let app: FastifyInstance;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    ({ app, cleanup } = await setUpTestApp());
  });

  afterAll(async () => {
    await cleanup();
  });

  it("creates a new player and returns their userId", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/signup",
      payload: {
        displayName: "newbie_nancy",
        email: "newbie@example.com",
        marketingConsent: true,
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.displayName).toBe("newbie_nancy");
    expect(typeof body.userId).toBe("number");
  });

  it("upserts by email: signing up again with the same email updates the name", async () => {
    const first = await app.inject({
      method: "POST",
      url: "/api/signup",
      payload: { displayName: "original_name", email: "repeat@example.com" },
    });
    const firstId = first.json().userId;

    const second = await app.inject({
      method: "POST",
      url: "/api/signup",
      payload: { displayName: "renamed", email: "repeat@example.com" },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual({ userId: firstId, displayName: "renamed" });
  });

  it("rejects a duplicate display name with a different email (409)", async () => {
    await app.inject({
      method: "POST",
      url: "/api/signup",
      payload: { displayName: "taken_name", email: "first-owner@example.com" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/signup",
      payload: { displayName: "taken_name", email: "second-owner@example.com" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("rejects an invalid payload with a 400 and validation details", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/signup",
      payload: { displayName: "a", email: "not-an-email" },
    });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe("Invalid sign-up data");
    expect(body.details).toBeDefined();
  });

  it("rejects a missing body with a 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/signup",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});
