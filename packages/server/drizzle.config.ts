import "dotenv/config";
import type { Config } from "drizzle-kit";

const url = (process.env.DB_URL ?? "file:./data/pong.db").replace(/^file:/, "");

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "sqlite",
  dbCredentials: { url },
} satisfies Config;
