# Operational footprint

What running this costs and what it depends on.

## Deployment unit

One Docker container running Node 20 Alpine. No sidecars. No external data stores. No job queue.

## Resource requirements

- **RAM:** comfortably under 100 MB steady state. SQLite + Fastify + Node process.
- **CPU:** negligible at rest. Traffic is sparse user actions (submit signup, submit match, fetch leaderboard).
- **Disk:** the container image is small (Alpine base + node_modules for the server only, ~200 MB). The database grows linearly with match count — each row is ~50 bytes, so 1 million matches is roughly 50 MB.
- **Network:** one inbound port — host default `3610`, mapped to the container's internal port `3000` (chosen to avoid colliding with other self-hosted apps that commonly default to `3000`). No outbound dependencies at runtime.

## External dependencies

**None at runtime.** Build-time dependencies (npm / pnpm / Docker Hub) only. No API keys, no third-party services, no DNS dependencies beyond what the user's browser resolves to reach the host.

## Hosting cost profile

Viable on anything that runs Docker:
- A $5/month VPS.
- A home Unraid / Synology / TrueNAS server.
- A Raspberry Pi 4+ (the container is amd64 by default; a `--platform linux/arm64` rebuild gets it to ARM).

No per-user cost. No per-request cost.

## Backup and restore

Persistent state is **one file** (plus two WAL sidecars):
```
./data/pong.db
./data/pong.db-shm
./data/pong.db-wal
```

Backup = copy the directory. Restore = put it back. WAL mode makes hot-copy safe in practice; cold-copy is belt-and-braces. A `sqlite3 pong.db ".backup out.db"` produces a clean snapshot without stopping the container.

## Observability

- Fastify + pino logs (pino-pretty in dev, raw JSON in prod). `LOG_LEVEL` env var.
- Healthcheck: `GET /api/health` every 30 s inside the container. Orchestrators (Docker, Kubernetes, Unraid, etc.) can use this directly.
- No metrics endpoint. No tracing. For the scale this product targets, structured logs are enough.

## Failure modes and recovery

| Failure | Behavior |
| --- | --- |
| Migration fails on boot | Server exits. Logs name the failing migration. Healthcheck fails → orchestrator restarts. |
| Seed fails on boot | Logged as non-fatal; server continues. Leaderboard is just empty. |
| DB file missing / unwritable | `better-sqlite3` throws on open. Server exits. |
| Request-time DB error | Returned as a 500 with a generic error; details in server logs. |
| Client loses network during a match | Match is held client-side; the `POST /api/matches` call fails; error is logged to the browser console. Player still sees the game-over screen — the loss just doesn't reach the leaderboard. |
| Client closes tab mid-match | Nothing is recorded (the match never resolved). |

None of these require human intervention beyond inspecting logs and correcting a bad DB path or a bad migration.

## Scaling ceilings

Not designed for scale. The hot ceilings would be, in order:
1. **SQLite write contention.** In WAL mode, many concurrent writers serialize but don't block readers. Thousands of active players simultaneously submitting match results would start queuing — but that is not the target.
2. **Single-node.** The container can be run on multiple nodes, but they'd each have their own SQLite file. There's no replication. Solving this means moving to Postgres (the ORM layer supports it; it is not wired).
3. **Static file serving from Fastify.** Fine for direct-to-user; behind a reverse proxy that handles caching even better.

If the product ever needs to scale, the migration is clear: swap [db/client.ts](../../packages/server/src/db/client.ts) to a Drizzle Postgres adapter, regenerate migrations, run the leaderboard query with `$1, $2` parameter syntax. Nothing else changes.

## Upgrade path

`git pull && docker compose up --build -d`. Migrations run on startup. Existing data is preserved. No manual step.
