import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { db } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, "./migrations");

console.log(`Running migrations from ${migrationsFolder}`);
migrate(db, { migrationsFolder });
console.log("Migrations complete.");
