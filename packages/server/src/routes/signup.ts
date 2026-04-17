import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { SignUpSchema } from "@3d-space-pong/shared";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export async function signupRoutes(app: FastifyInstance) {
  app.post("/api/signup", async (request, reply) => {
    const parsed = SignUpSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid sign-up data",
        details: parsed.error.flatten(),
      });
    }

    const { displayName, email, marketingConsent } = parsed.data;

    // Upsert by email: if user exists, update display name and consent; else insert.
    const existing = db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (existing) {
      db.update(users)
        .set({ displayName, marketingConsent })
        .where(eq(users.id, existing.id))
        .run();
      return reply.send({ userId: existing.id, displayName });
    }

    try {
      const inserted = db
        .insert(users)
        .values({ displayName, email, marketingConsent })
        .returning({ id: users.id })
        .get();

      if (!inserted) {
        return reply.code(500).send({ error: "Failed to create user" });
      }

      return reply.send({ userId: inserted.id, displayName });
    } catch (err) {
      // Likely a unique constraint on display_name
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("UNIQUE") && message.includes("display_name")) {
        return reply.code(409).send({
          error: "That display name is taken. Try another.",
        });
      }
      throw err;
    }
  });
}
