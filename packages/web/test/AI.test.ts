import { describe, expect, it, vi } from "vitest";
import { AIController, DIFFICULTY_PROFILES } from "../src/game/AI.js";

describe("DIFFICULTY_PROFILES", () => {
  it("has an entry for every documented level", () => {
    for (const level of ["rookie", "amateur", "pro", "expert", "legend"] as const) {
      expect(DIFFICULTY_PROFILES[level].level).toBe(level);
    }
  });

  it("gets strictly harder (less reaction delay, more speed) as level rises", () => {
    const order = ["rookie", "amateur", "pro", "expert", "legend"] as const;
    for (let i = 1; i < order.length; i++) {
      const prev = DIFFICULTY_PROFILES[order[i - 1]];
      const curr = DIFFICULTY_PROFILES[order[i]];
      expect(curr.reactionDelay).toBeLessThan(prev.reactionDelay);
      expect(curr.maxSpeed).toBeGreaterThanOrEqual(prev.maxSpeed);
      expect(curr.trackingError).toBeLessThanOrEqual(prev.trackingError);
    }
  });

  it("only legend is predictive", () => {
    for (const level of ["rookie", "amateur", "pro", "expert"] as const) {
      expect(DIFFICULTY_PROFILES[level].predictive).toBe(false);
    }
    expect(DIFFICULTY_PROFILES.legend.predictive).toBe(true);
  });
});

describe("AIController.computeTargetY", () => {
  it("chases the ball's current Y when not predictive (rookie)", () => {
    const ai = new AIController("rookie");
    // No random error: trackingError is 0.25 for rookie, so pin Math.random to 0.5
    // which maps the error term `(rand*2-1)*trackingError*halfHeight` to 0.
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const targetY = ai.computeTargetY(
      { x: 0, y: 3, vx: 1, vy: 0 },
      /* paddle */ 0,
      /* paddleX */ 10,
      /* halfHeight */ 6,
      /* now */ 0,
    );
    expect(targetY).toBeCloseTo(3);

    vi.restoreAllMocks();
  });

  it("clamps the target within [-halfHeight, halfHeight]", () => {
    const ai = new AIController("rookie");
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const targetY = ai.computeTargetY(
      { x: 0, y: 999, vx: 1, vy: 0 },
      0,
      10,
      6,
      0,
    );
    expect(targetY).toBe(6);

    vi.restoreAllMocks();
  });

  it("only re-evaluates after the reaction delay elapses", () => {
    const ai = new AIController("rookie"); // reactionDelay 0.35s
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    const first = ai.computeTargetY({ x: 0, y: 1, vx: 1, vy: 0 }, 0, 10, 6, 0);
    expect(first).toBeCloseTo(1);

    // Ball moved, but not enough time has passed — target should be unchanged.
    const stillOld = ai.computeTargetY(
      { x: 0, y: 5, vx: 1, vy: 0 },
      0,
      10,
      6,
      0.1,
    );
    expect(stillOld).toBeCloseTo(1);

    // Past the reaction delay — should pick up the new ball position.
    const updated = ai.computeTargetY(
      { x: 0, y: 5, vx: 1, vy: 0 },
      0,
      10,
      6,
      0.4,
    );
    expect(updated).toBeCloseTo(5);

    vi.restoreAllMocks();
  });

  it("legend predicts the intercept Y from ball velocity when heading toward it", () => {
    const ai = new AIController("legend"); // predictive, trackingError 0
    // ball at x=0 moving toward paddle at x=10 with vx=10 (1s to arrive),
    // vy=2 means it'll be 2 units higher by the time it reaches the paddle.
    const targetY = ai.computeTargetY(
      { x: 0, y: 0, vx: 10, vy: 2 },
      0,
      10,
      6,
      0,
    );
    expect(targetY).toBeCloseTo(2);
  });

  it("legend falls back to the ball's current Y when heading away", () => {
    const ai = new AIController("legend");
    // paddleX > 0 but ball moving away (vx < 0) => not heading toward AI.
    const targetY = ai.computeTargetY(
      { x: 0, y: 4, vx: -10, vy: 2 },
      0,
      10,
      6,
      0,
    );
    expect(targetY).toBeCloseTo(4);
  });
});

describe("AIController.maxSpeedFor", () => {
  it("scales with arena width and the profile's maxSpeed fraction", () => {
    const ai = new AIController("expert"); // maxSpeed 0.95
    expect(ai.maxSpeedFor(20)).toBeCloseTo(19);
  });
});
