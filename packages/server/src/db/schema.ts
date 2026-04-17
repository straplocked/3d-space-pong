import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  displayName: text("display_name").notNull().unique(),
  email: text("email").notNull().unique(),
  marketingConsent: integer("marketing_consent", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  difficulty: text("difficulty", {
    enum: ["rookie", "amateur", "pro", "expert", "legend"],
  }).notNull(),
  outcome: text("outcome", { enum: ["win", "loss"] }).notNull(),
  playerScore: integer("player_score").notNull(),
  aiScore: integer("ai_score").notNull(),
  durationMs: integer("duration_ms").notNull(),
  playedAt: integer("played_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Match = typeof matches.$inferSelect;
export type NewMatch = typeof matches.$inferInsert;
