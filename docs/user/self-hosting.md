# Self-hosting

One container, one port, one bind mount. SQLite means there's nothing else to run.

## Requirements

- Docker (and Docker Compose v2).
- A box with at least ~200 MB free for the image + a few MB for the DB.
- A port (default host port `3610`; the container listens internally on `3000`).

## Fastest path: docker compose

From the repo root:

```bash
docker compose up --build -d
```

Then open `http://<your-server>:3610`. `3610` is the shipped default host-port mapping in `docker-compose.yml` — chosen so it doesn't collide with other self-hosted apps that default to `3000` (the container's own internal port, unchanged). Remap the left side of the `ports:` entry if you want a different host port.

The SQLite database is persisted in `./data/pong.db` via a bind mount — `docker compose down && docker compose up` keeps your data intact. If you want a clean slate, `rm -rf ./data && docker compose up`.

## Unraid

A Community Applications template is included at [`unraid/3d-space-pong.xml`](../../unraid/3d-space-pong.xml) — image `ghcr.io/straplocked/3d-space-pong:latest`, WebUI port defaulting to host `3610` → container `3000`, and an `/app/data` path mapping. Install it via Unraid's "Add Container" → template URL flow, or do it by hand:

1. Clone this repo onto your server: `/mnt/user/appdata/3d-space-pong`.
2. From that directory: `docker compose up -d --build`.
3. Map host port `3610` to container port `3000` (or remap as you like — the container's internal port should stay `3000`).
4. Bind-mount `./data → /app/data` so the database survives container restarts.
5. Optional: put it behind your reverse proxy of choice.

## Progressive Web App

The server also serves a web app manifest (`/manifest.webmanifest`, `Content-Type: application/manifest+json`) and a service worker (`/sw.js`, `Cache-Control: no-cache` so updates are never stuck behind a stale cache). Players can install the site from their browser as an app; the built app shell is precached for offline play of the local game modes. No extra reverse-proxy configuration is needed — both files are served from the same origin as everything else. See [docs/technical/web/router-lifecycle.md](../technical/web/router-lifecycle.md) and [docs/technical/server/environment.md](../technical/server/environment.md#static-file-headers) for implementation details.

## Environment variables

See [.env.example](../../.env.example). All optional — defaults work out of the box.

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port **inside the container**. The host-side mapping (what you actually browse to) is set in `docker-compose.yml`'s `ports:` — default `3610:3000`. |
| `HOST` | `0.0.0.0` | Bind address. |
| `DB_DRIVER` | `sqlite` | Currently the only implementation. |
| `DB_URL` | `file:/app/data/pong.db` | SQLite file path (include `file:` prefix). |
| `LOG_LEVEL` | `info` | Pino log level. |
| `NODE_ENV` | `production` (set in the Dockerfile) | Toggles pino-pretty vs raw JSON logs. |

Override any of them in `docker-compose.yml`'s `environment:` block or via `-e VAR=value` on `docker run`.

## Healthcheck

The container includes a healthcheck against `GET /api/health`. Success:
```json
{ "status": "ok", "vibes": "immaculate" }
```

If your orchestrator shows the container as unhealthy, check:
- Is the port actually exposed and reachable?
- Did migrations fail at startup? Logs will say so — the server exits on migration failure.

## Backing up the database

The whole app's persistent state is one SQLite file plus its WAL sidecars:

```
./data/pong.db
./data/pong.db-shm
./data/pong.db-wal
```

Copying all three while the container is running is fine — the WAL mode makes it safe. For a guaranteed consistent snapshot, stop the container first or use `sqlite3 pong.db ".backup ..."`.

## Updating

```bash
git pull
docker compose up --build -d
```

Migrations run on startup. The existing DB is preserved; any schema changes land automatically.

## Running without Docker (dev)

See the project [README](../../README.md#local-development) for `pnpm install && pnpm dev`. Dev mode uses the same SQLite layout under `packages/server/data/pong.db`.
