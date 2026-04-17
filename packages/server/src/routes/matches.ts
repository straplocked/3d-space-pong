import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { MatchResultSchema } from "@3d-pong/shared";
import { db } from "../db/client.js";
import { matches, users } from "../db/schema.js";

export async function matchesRoutes(app: FastifyInstance) {
  app.post("/api/matches", async (request, reply) => {
    const parsed = MatchResultSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid match result",
        details: parsed.error.flatten(),
      });
    }

    const { userId, difficulty, outcome, playerScore, aiScore, durationMs } =
      parsed.data;

    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    const inserted = db
      .insert(matches)
      .values({
        userId,
        difficulty,
        outcome,
        playerScore,
        aiScore,
        durationMs,
      })
      .returning({ id: matches.id })
      .get();

    return reply.send({ matchId: inserted?.id ?? null });
  });
}
