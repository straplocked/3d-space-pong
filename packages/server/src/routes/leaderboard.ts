import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { LeaderboardQuerySchema } from "@3d-pong/shared";
import type { LeaderboardRow } from "@3d-pong/shared";
import { rawSqlite } from "../db/client.js";

interface RawRow {
  userId: number;
  displayName: string;
  wins: number;
  losses: number;
  totalGames: number;
  shortestLossMs: number | null;
  lostToRookie: number;
  beatLegend: number;
}

function rowToLeaderboard(row: RawRow): LeaderboardRow {
  const ratio =
    row.losses === 0
      ? row.wins > 0
        ? row.wins
        : null
      : row.wins / row.losses;
  return {
    userId: row.userId,
    displayName: row.displayName,
    wins: row.wins,
    losses: row.losses,
    totalGames: row.totalGames,
    ratio: ratio === null ? null : Number(ratio.toFixed(2)),
    shortestLossMs: row.shortestLossMs,
    lostToRookie: row.lostToRookie === 1,
    beatLegend: row.beatLegend === 1,
  };
}

export async function leaderboardRoutes(app: FastifyInstance) {
  app.get("/api/leaderboard", async (request, reply) => {
    const parsed = LeaderboardQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Invalid query",
        details: parsed.error.flatten(),
      });
    }
    const { sort, difficulty, limit } = parsed.data;

    // Build the difficulty filter snippet (parameterized).
    const difficultyFilter = difficulty
      ? "AND m.difficulty = @difficulty"
      : "";

    // Aggregate per user. Badges are computed via EXISTS subqueries against
    // the unfiltered matches table so they remain accurate regardless of the
    // current difficulty filter.
    const baseSelect = `
      SELECT
        u.id AS userId,
        u.display_name AS displayName,
        SUM(CASE WHEN m.outcome = 'win' THEN 1 ELSE 0 END) AS wins,
        SUM(CASE WHEN m.outcome = 'loss' THEN 1 ELSE 0 END) AS losses,
        COUNT(m.id) AS totalGames,
        MIN(CASE WHEN m.outcome = 'loss' THEN m.duration_ms END) AS shortestLossMs,
        EXISTS (
          SELECT 1 FROM matches mr
          WHERE mr.user_id = u.id AND mr.difficulty = 'rookie' AND mr.outcome = 'loss'
        ) AS lostToRookie,
        EXISTS (
          SELECT 1 FROM matches ml
          WHERE ml.user_id = u.id AND ml.difficulty = 'legend' AND ml.outcome = 'win'
        ) AS beatLegend
      FROM users u
      INNER JOIN matches m ON m.user_id = u.id
      WHERE 1=1 ${difficultyFilter}
      GROUP BY u.id, u.display_name
    `;

    let orderClause: string;
    let havingClause = "";
    switch (sort) {
      case "wins":
        orderClause = "ORDER BY wins DESC, losses ASC, totalGames DESC";
        break;
      case "losses":
        orderClause = "ORDER BY losses DESC, wins ASC, totalGames DESC";
        break;
      case "ratio":
        // Min 5 games for ratio sort to avoid one-game flukes.
        havingClause = "HAVING totalGames >= 5";
        orderClause =
          "ORDER BY (CAST(wins AS REAL) / NULLIF(losses, 0)) DESC NULLS LAST, wins DESC";
        break;
      case "shortest_loss":
        havingClause = "HAVING shortestLossMs IS NOT NULL";
        orderClause = "ORDER BY shortestLossMs ASC";
        break;
      case "rookie_victims":
        havingClause = "HAVING lostToRookie = 1";
        orderClause = "ORDER BY losses DESC, wins ASC";
        break;
    }

    const finalSql = `${baseSelect} ${havingClause} ${orderClause} LIMIT @limit`;

    const stmt = rawSqlite.prepare(finalSql);
    const params: Record<string, unknown> = { limit };
    if (difficulty) params.difficulty = difficulty;

    const rows = stmt.all(params) as RawRow[];
    const leaderboard = rows.map(rowToLeaderboard);
    return reply.send({ sort, difficulty: difficulty ?? null, leaderboard });
  });
}
