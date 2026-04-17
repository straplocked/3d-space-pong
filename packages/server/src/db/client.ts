import "dotenv/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema.js";

function resolveSqlitePath(): string {
  const raw = process.env.DB_URL ?? "file:./data/pong.db";
  const path = raw.replace(/^file:/, "");
  return resolve(process.cwd(), path);
}

const dbPath = resolveSqlitePath();
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });
export const rawSqlite = sqlite;
export { schema };
