import "dotenv/config";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

import { db } from "./db/client.js";
import { seedIfEmpty } from "./db/seed.js";
import { signupRoutes } from "./routes/signup.js";
import { matchesRoutes } from "./routes/matches.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "0.0.0.0";

async function main() {
  // Run migrations on startup so a fresh container "just works".
  const migrationsFolder = resolve(__dirname, "./db/migrations");
  if (existsSync(migrationsFolder)) {
    try {
      migrate(db, { migrationsFolder });
    } catch (err) {
      console.error("Migration failed:", err);
      throw err;
    }
  }

  // Seed the Hall of Shame on first boot (no-op if it already has data).
  try {
    seedIfEmpty();
  } catch (err) {
    console.error("Seed failed (non-fatal):", err);
  }

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV === "production"
          ? undefined
          : {
              target: "pino-pretty",
              options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
            },
    },
  });

  await app.register(fastifyCors, {
    origin: true,
    credentials: false,
  });

  app.get("/api/health", async () => ({
    status: "ok",
    vibes: "immaculate",
  }));

  await signupRoutes(app);
  await matchesRoutes(app);
  await leaderboardRoutes(app);

  // Serve the built web bundle if present.
  // Path is relative to the compiled server: dist/index.js -> ../../web/dist
  // For dev (tsx running src/index.ts), the path is src/../../web/dist
  const candidates = [
    resolve(__dirname, "../../web/dist"),
    resolve(__dirname, "../../../web/dist"),
    resolve(process.cwd(), "../web/dist"),
    resolve(process.cwd(), "packages/web/dist"),
  ];
  const webRoot = candidates.find((p) => existsSync(p));
  if (webRoot) {
    app.log.info(`Serving static web from ${webRoot}`);
    await app.register(fastifyStatic, {
      root: webRoot,
      prefix: "/",
      wildcard: false,
      setHeaders: (res, filePath) => {
        // The default mime db doesn't know `.webmanifest`, and browsers
        // are strict about the PWA manifest's content-type — without this
        // it gets served as application/octet-stream and gets ignored.
        if (filePath.endsWith(".webmanifest")) {
          res.setHeader("Content-Type", "application/manifest+json");
        }
        // The service worker file must never be served from a stale
        // cache — browsers already re-check it periodically, but an
        // intermediary (or the browser's HTTP cache) caching an old
        // version would prevent updated app shells from ever activating.
        if (filePath.endsWith("/sw.js") || filePath.endsWith("\\sw.js")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    });
    // SPA fallback to index.html for non-API routes.
    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith("/api/")) {
        return reply.code(404).send({ error: "Not found" });
      }
      return reply.sendFile("index.html");
    });
  } else {
    app.log.warn(
      "Web bundle not found — running in API-only mode (this is fine in dev).",
    );
  }

  try {
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
