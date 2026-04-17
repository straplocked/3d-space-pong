import type { Difficulty } from "@3d-space-pong/shared";

export interface DifficultyProfile {
  level: Difficulty;
  name: string;
  subtitle: string;
  /** Reaction delay in seconds — AI tracks where the ball *was* this many seconds ago. */
  reactionDelay: number;
  /** Max paddle velocity as fraction of arena width per second. */
  maxSpeed: number;
  /** Random tracking error as fraction of arena half-height. */
  trackingError: number;
  /** If true, AI predicts intercept point from velocity rather than chasing. */
  predictive: boolean;
}

export const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  rookie: {
    level: "rookie",
    name: "Rookie",
    subtitle: "Has never held a paddle before",
    reactionDelay: 0.35,
    maxSpeed: 0.5,
    trackingError: 0.25,
    predictive: false,
  },
  amateur: {
    level: "amateur",
    name: "Amateur",
    subtitle: "Practiced for a weekend, feels unstoppable",
    reactionDelay: 0.22,
    maxSpeed: 0.7,
    trackingError: 0.15,
    predictive: false,
  },
  pro: {
    level: "pro",
    name: "Pro",
    subtitle: "Makes eye contact with you through the screen",
    reactionDelay: 0.12,
    maxSpeed: 0.85,
    trackingError: 0.07,
    predictive: false,
  },
  expert: {
    level: "expert",
    name: "Expert",
    subtitle: "Has read your source code",
    reactionDelay: 0.06,
    maxSpeed: 0.95,
    trackingError: 0.03,
    predictive: false,
  },
  legend: {
    level: "legend",
    name: "Legend",
    subtitle: "Is the source code",
    reactionDelay: 0.02,
    maxSpeed: 1.0,
    trackingError: 0,
    predictive: true,
  },
};

/**
 * AIController — given the current ball state and time, returns a target Y
 * position for the AI paddle. Pure logic, no three.js dependency.
 */
export class AIController {
  private profile: DifficultyProfile;
  private targetY = 0;
  private nextReactionAt = 0;
  private currentRandomError = 0;

  constructor(difficulty: Difficulty) {
    this.profile = DIFFICULTY_PROFILES[difficulty];
  }

  /**
   * @param ball  Current ball position and velocity in arena-local coordinates.
   * @param paddle Current AI paddle Y position.
   * @param paddleX X position of the AI paddle (intercept plane).
   * @param halfHeight Arena half-height (paddle Y range is [-halfHeight, +halfHeight]).
   * @param now Time in seconds (performance.now() / 1000).
   * @returns Target Y position the paddle should move toward.
   */
  computeTargetY(
    ball: { x: number; y: number; vx: number; vy: number },
    paddle: number,
    paddleX: number,
    halfHeight: number,
    now: number,
  ): number {
    if (now >= this.nextReactionAt) {
      const ballHeadingTowardAI =
        (paddleX > 0 && ball.vx > 0) || (paddleX < 0 && ball.vx < 0);

      let raw: number;
      if (this.profile.predictive && ballHeadingTowardAI) {
        // Predict intercept Y by extrapolating ball motion (ignoring bounces;
        // bounces would average out for arena depth — good enough for Legend).
        const dt = (paddleX - ball.x) / ball.vx;
        raw = ball.y + ball.vy * dt;
        // Wrap into the arena to roughly account for one bounce.
        const span = halfHeight * 2;
        while (raw > halfHeight) raw = halfHeight - (raw - halfHeight);
        while (raw < -halfHeight) raw = -halfHeight + (-halfHeight - raw);
      } else {
        raw = ball.y;
      }

      // Re-roll random tracking error each reaction tick.
      this.currentRandomError =
        (Math.random() * 2 - 1) * this.profile.trackingError * halfHeight;

      this.targetY = Math.max(
        -halfHeight,
        Math.min(halfHeight, raw + this.currentRandomError),
      );
      this.nextReactionAt = now + this.profile.reactionDelay;
    }
    return this.targetY;
  }

  /** Max paddle speed in world units per second. */
  maxSpeedFor(arenaWidth: number): number {
    return arenaWidth * this.profile.maxSpeed;
  }

  get current(): DifficultyProfile {
    return this.profile;
  }
}
