# Self-hosting

One container, one port, one bind mount. SQLite means there's nothing else to run.

## Requirements

- Docker (and Docker Compose v2).
- A box with at least ~200 MB free for the image + a few MB for the DB.
- A port (default `3000`).

## Fastest path: docker compose

From the repo root:

```bash
docker compose up --build -d
```

Then open `http://<your-server>:3000`.

The SQLite database is persisted in `./data/pong.db` via a bind mount — `docker compose down && docker compose up` keeps your data intact. If you want a clean slate, `rm -rf ./data && docker compose up`.

## Unraid

1. Clone this repo onto your server: `/mnt/user/appdata/3d-space-pong`.
2. From that directory: `docker compose up -d --build`.
3. Map host port `3000` to container port `3000` (or remap as you like).
4. Bind-mount `./data → /app/data` so the database survives container restarts.
5. Optional: put it behind your reverse proxy of choice.

## Environment variables

See [.env.example](../../.env.example). All optional — defaults work out of the box.

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port. |
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
