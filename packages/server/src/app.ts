import Fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCors from "@fastify/cors";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";

import { signupRoutes } from "./routes/signup.js";
import { matchesRoutes } from "./routes/matches.js";
import { leaderboardRoutes } from "./routes/leaderboard.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface BuildAppOptions {
  /**
   * Whether to try serving the built web bundle (and install the SPA
   * fallback 404 handler). Defaults to true. Tests set this to false to
   * get a plain API-only instance regardless of whether packages/web/dist
   * happens to exist on disk.
   */
  serveWeb?: boolean;
}

/**
 * Builds (but does not start listening on) a Fastify instance with all
 * routes registered. Split out from index.ts so both the production
 * entrypoint and tests (via `.inject()`) can build the same app without
 * also running migrations/seed/listen as a side effect of importing it.
 */
export async function buildApp(
  opts: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const { serveWeb = true } = opts;

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
      transport:
        process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test"
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

  if (serveWeb) {
    // Serve the built web bundle if present.
    // Path is relative to the compiled server: dist/app.js -> ../../web/dist
    // For dev (tsx running src/app.ts), the path is src/../../web/dist
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
  }

  return app;
}
