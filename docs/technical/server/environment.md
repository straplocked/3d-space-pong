# Environment

Everything the server reads from the environment, and how the container is laid out.

## Environment variables

See [.env.example](../../../.env.example).

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port the server binds. |
| `HOST` | `0.0.0.0` | Bind address. |
| `DB_DRIVER` | `sqlite` | Only `sqlite` is currently wired. Postgres hooks exist in Drizzle but aren't registered. |
| `DB_URL` | `file:./data/pong.db` | SQLite file path. The `file:` prefix is stripped; the rest is resolved **relative to `process.cwd()`**. |
| `NODE_ENV` | *(unset in dev)* | When `production`, Fastify logger emits raw pino JSON; otherwise `pino-pretty`. |
| `LOG_LEVEL` | `info` | Pino log level. |

`DB_URL` lookup logic is in [db/client.ts](../../../packages/server/src/db/client.ts). The parent directory is created with `mkdirSync(..., { recursive: true })` so a fresh path like `file:/app/data/pong.db` works on first boot.

`dotenv/config` is imported at the top of both [index.ts](../../../packages/server/src/index.ts) and [db/client.ts](../../../packages/server/src/db/client.ts), so a local `.env` file is loaded automatically in dev.

## Dockerfile layout

See [Dockerfile](../../../Dockerfile). Four stages:

### 1. `base`
`node:20-alpine` + pnpm 9 + build toolchain (`python3`, `make`, `g++`) for compiling `better-sqlite3`'s native addon.

### 2. `deps`
Copies root `package.json` + `pnpm-workspace.yaml` + per-package `package.json` files, then `pnpm install --frozen-lockfile=false`. This produces a cacheable deps layer independent of source changes.

### 3. `build`
Copies source (`tsconfig.base.json` + all three packages) and runs:
```bash
pnpm --filter @3d-space-pong/shared run build \
  && pnpm --filter @3d-space-pong/web run build \
  && pnpm --filter @3d-space-pong/server run build
```
Order matters — shared must exist before web/server can import it. The server's own `build` script is `tsc -p tsconfig.json && node scripts/copy-migrations.js` — the second half copies `src/db/migrations` into `dist/db/migrations` (see [seed-and-migrations.md](./seed-and-migrations.md)), since `tsc` doesn't emit non-TS files on its own. This runs identically here and in a plain local `pnpm build`.

### 4. `runtime`
Slim image. Installs only the server's production deps via the pnpm filter arrow (`@3d-space-pong/server...`), copies dist artifacts, and sets:

```
ENV NODE_ENV=production
    PORT=3000
    HOST=0.0.0.0
    DB_DRIVER=sqlite
    DB_URL=file:/app/data/pong.db
```

The migrations folder is already inside `/app/packages/server/dist` by the time this stage copies it — the server's `build` script put it there (see stage 3 above) — so the runtime stage just copies the whole `dist` directory and needs no separate migrations copy step.

Other runtime specifics:
- `VOLUME ["/app/data"]` — declares the DB directory as a mount target.
- `EXPOSE 3000`.
- Healthcheck: `wget -qO- http://localhost:3000/api/health`, every 30s.
- Entrypoint: `tini --` (signal handling), CMD: `node dist/index.js`.
- WORKDIR at runtime: `/app/packages/server` (so relative paths resolve correctly).

## Static file headers

`@fastify/static`'s default mime lookup doesn't know the `.webmanifest` extension, and would serve it as `application/octet-stream` — several browsers ignore a manifest served that way. [index.ts](../../../packages/server/src/index.ts) passes a `setHeaders` callback to the plugin registration to fix that up per-file:

- `*.webmanifest` → `Content-Type: application/manifest+json`
- `sw.js` → `Cache-Control: no-cache` (the service worker file must always be revalidated; a cached stale copy would block newer app-shell versions from ever activating)

Everything else falls through to `@fastify/static`'s normal mime-based content-type and caching behavior. The SPA fallback (`setNotFoundHandler` → `index.html`) is unaffected — it only applies to non-`/api/*`, non-static-file paths.

## Compose

See [docker-compose.yml](../../../docker-compose.yml). One service `app`:
- Port mapping `3000:3000`.
- Bind mount `./data → /app/data` (persists the SQLite file on the host).
- Environment block mirrors the Dockerfile's `ENV` so overriding at runtime is obvious.
- `restart: unless-stopped` and the healthcheck for orchestration-aware restart behavior.

## Data directory

The bind mount is `./data` on the host → `/app/data` in the container. The repo includes an empty `data/` at root for this purpose; the SQLite file (`pong.db`) plus its WAL sidecars live there at runtime. Nothing else belongs in this directory.

To back up: `cp -r ./data ./data.backup`. To wipe and re-seed: `rm ./data/pong.db*`.
