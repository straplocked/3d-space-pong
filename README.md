# 3D Space Pong

> A 3D Space Pong game that keeps receipts.

Open-source 3D Space Pong, built with [three.js](https://threejs.org/) for the game and [parallax.js](https://matthew.wagerfield.com/parallax/) for the layered background. One-page web app, 1P vs AI (5 difficulty levels) or 2P local. Tracks every match against the computer — wins **and** losses — in a Hall of Fame *and* a Hall of Shame.

## Features

- 🎮 **Two modes** — 1P vs AI, 2P local (split keyboard, or split-screen touch on one phone)
- 🤖 **Five AI difficulty levels** — from Rookie ("has never held a paddle before") to Legend ("is the source code")
- 💀 **Wins AND losses tracked** — losing to Rookie earns you a permanent badge of shame
- 🌌 **Parallax background** — layered depth on every screen via parallax.js
- ✨ **Bloom post-processing** — neon vibe via three.js `UnrealBloomPass`
- 📱 **Installable PWA** — add it to your homescreen, play fullscreen, works offline for local modes
- 📦 **Dockerized** — single container, single bind mount, perfect for self-hosting on Unraid
- 🗄️ **SQLite by default** — zero-config, single file, runs anywhere
- 🛠️ **Drizzle ORM** — type-safe schema, swappable to Postgres later

## Screenshots

The game is **dark-only by design** (see [docs/leadership/product-overview.md](docs/leadership/product-overview.md#dark-only-no-light-theme) for the decision) — the manifest, `theme-color`, and `color-scheme: dark` all agree, so there's nothing to show in a "light" variant. Captured from a real headless-Chromium run of the built app at desktop (1440×900) and phone-landscape (844×390) viewports.

| Menu | Gameplay (2P local) |
| --- | --- |
| ![Menu](docs/assets/screenshots/menu-desktop.png) | ![Gameplay](docs/assets/screenshots/game-desktop.png) |

| Hall of Fame | Hall of Shame |
| --- | --- |
| ![Hall of Fame](docs/assets/screenshots/hall-of-fame-desktop.png) | ![Hall of Shame](docs/assets/screenshots/hall-of-shame-desktop.png) |

Phone-landscape (`-phone.png`) captures live alongside these under [`docs/assets/screenshots/`](docs/assets/screenshots/). Regenerate everything with [`scripts/screenshots.mjs`](scripts/screenshots.mjs) — run the app first, then:

```bash
# with the app already running at BASE_URL (e.g. `node packages/server/dist/index.js`)
docker run --rm --network host \
  -v "$PWD/scripts:/scripts:ro" \
  -v "$PWD/docs/assets/screenshots:/out" \
  mcr.microsoft.com/playwright:v1.55.1-noble \
  bash -c "mkdir -p /work && cd /work && npm install --no-save --cache /tmp/npmcache playwright@1.55.1 && \
    cp /scripts/screenshots.mjs /work/screenshots.mjs && \
    node /work/screenshots.mjs --base-url=http://localhost:3712 --out-dir=/out"
```

(The `cp` step works around the Playwright image's npm occasionally tripping over a stale `idealTree` lock when `node_modules` and the script live in different mounted volumes — installing and running from the same writable directory avoids it.)

## Install as an app

The site is an installable Progressive Web App:

- Tap **INSTALL** on the main menu (Android / desktop Chrome opens the install prompt; iOS Safari shows an "Add to Home Screen" hint), or use the browser menu: **Android / desktop Chrome** — menu → "Install app". **iOS Safari** — Share → "Add to Home Screen".
- Launches fullscreen, landscape-oriented, with its own icon — no browser chrome.
- The **FULLSCREEN** button on the main menu also toggles fullscreen on demand from inside a normal browser tab (it hides itself once you've already installed the app, or if the browser doesn't support the Fullscreen API).
- The built app shell is precached by a service worker, so the menu, 2P local, GFX tuning, and attract mode all keep working offline. Signup, AI match recording, and the leaderboard still need a connection (they talk to `/api/*`, which the service worker always sends straight to the network).

See [docs/user/getting-started.md](docs/user/getting-started.md#installing-as-an-app) for the player-facing version of this, and [docs/technical/architecture.md](docs/technical/architecture.md) for how the manifest/service worker are built and served.

## Tech stack

| Layer       | What                                |
| ----------- | ----------------------------------- |
| Frontend    | TypeScript + Vite + three.js + parallax.js |
| Backend     | Fastify + Drizzle ORM + better-sqlite3 |
| Validation  | Zod schemas (shared client/server)  |
| Container   | Docker + docker compose             |
| License     | MIT                                 |

## Project layout

```
3d-space-pong/
├── packages/
│   ├── shared/   # zod schemas + types shared by client and server
│   ├── server/   # Fastify API + Drizzle ORM + SQLite migrations
│   └── web/      # Vite + three.js + parallax.js front-end
├── unraid/       # Unraid Community Applications template
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Run locally

### Requirements

- Node.js 20+
- pnpm 9+ (`corepack enable && corepack prepare pnpm@9.0.0 --activate`)

### Option A: dev mode (recommended)

```bash
pnpm install
pnpm dev
```

This starts:

- Vite dev server on **http://localhost:5173** (the front-end)
- Fastify API on **http://localhost:3000** (the back-end)

Vite proxies `/api/*` to the API, so the front-end always talks to `/api/...` regardless of the environment. `pnpm dev` runs the server with `tsx`, straight from `src/`, so migrations run automatically against `packages/server/src/db/migrations` on every start.

### Option B: build once, run the compiled server

```bash
pnpm install
pnpm build
pnpm --filter @3d-space-pong/server run db:migrate   # see note below
node packages/server/dist/index.js
```

The single Fastify server then serves both `/api/*` and the built web bundle on `http://localhost:3000`.

> **Known gap:** `pnpm build` (via `tsc`) does not copy the raw `.sql` migration files into `packages/server/dist/db/migrations`. The Docker image works around this with an explicit `COPY` step (see [`Dockerfile`](Dockerfile)), but a plain local `pnpm build && node dist/index.js` will silently skip migrations and 500 on first API call ("no such table: ..."). Run `pnpm --filter @3d-space-pong/server run db:migrate` first (it runs against `src/db/migrations`, so it always finds the SQL) to work around it until the build script copies the migrations folder itself.

### Hitting the dev server from another machine

Vite is configured with `host: true`, so it binds to `0.0.0.0`. From another device on your LAN, open `http://<your-machine-ip>:5173`. The browser must support WebGL — most modern desktop and mobile browsers do.

### Database

A fresh SQLite database is created automatically (parent directories included) at the path in `DB_URL` — `packages/server/data/pong.db` by default — on first run.

To regenerate migrations after changing `schema.ts`:

```bash
pnpm db:generate
```

## How to make it our problem (self-host)

### Docker compose (one-liner)

```bash
docker compose up --build -d
```

Then open **http://<your-server>:3610**. The default host port is `3610` (the container's internal port stays `3000`) — chosen to avoid colliding with other self-hosted apps that default to `3000`; remap the left side of `ports:` in `docker-compose.yml` if you'd rather use something else. The SQLite file is persisted in `./data/pong.db` via a bind mount, so `docker compose down && docker compose up` keeps your data.

### Unraid

A ready-made Community Applications template lives at [`unraid/3d-space-pong.xml`](unraid/3d-space-pong.xml) (image `ghcr.io/straplocked/3d-space-pong:latest`, WebUI on host port `3610` → container `3000`, `/app/data` path). Point Unraid's template install flow at it, or:

1. Clone this repo to a folder on your server (e.g. `/mnt/user/appdata/3d-space-pong`).
2. From that folder, run `docker compose up -d --build`.
3. Map host port `3610` (or whatever you prefer) to container port `3000`, and bind-mount `./data` to keep the database between container restarts.
4. Optionally put it behind your reverse proxy of choice.

### Environment variables

| Variable     | Default                       | Notes                                       |
| ------------ | ----------------------------- | ------------------------------------------- |
| `PORT`       | `3000`                        | HTTP port the server listens on **inside the container** |
| `HOST`       | `0.0.0.0`                     | Bind address                                |
| `DB_DRIVER`  | `sqlite`                      | Currently only `sqlite` is implemented      |
| `DB_URL`     | `file:./data/pong.db`         | SQLite file path (use `file:` prefix)       |
| `LOG_LEVEL`  | `info`                        | Pino log level                              |

`PORT` is the container's internal listening port and stays `3000` — it's the *host* port mapping (left side of `docker-compose.yml`'s `ports:`, default `3610`) that you'd change to avoid a collision on your network; see [Unraid](#unraid) above.

Postgres support is wired into the schema layer but not yet bundled — open an issue if you need it.

## API

| Method | Path                                                           | Purpose                          |
| ------ | -------------------------------------------------------------- | -------------------------------- |
| GET    | `/api/health`                                                  | Healthcheck (returns vibes)      |
| POST   | `/api/signup`                                                  | Create or update a user (upsert by email) |
| POST   | `/api/matches`                                                 | Record a 1P-vs-AI match result   |
| GET    | `/api/leaderboard?sort=wins\|losses\|ratio\|shortest_loss\|rookie_victims&difficulty=...&limit=20` | The Hall of Fame, Shame, and everything in between |

All POST bodies are validated with Zod schemas from `@3d-space-pong/shared`.

## Controls

| Player        | Up    | Down  |
| ------------- | ----- | ----- |
| Player 1 / Human | `W`   | `S`   |
| Player 2         | `↑`   | `↓`   |

In **1P vs AI** mode, P1 controls the human paddle and the AI controls the right side. In **2P local**, both players share one keyboard.

## Humor as a feature

The whole app is quietly roasting you. All player-facing copy lives in [`packages/web/src/content/quips.ts`](packages/web/src/content/quips.ts) — non-developers can PR jokes there without touching game logic. Design rules:

1. **Dry over loud.** Portal/Stanley-Parable voice, not meme energy.
2. **Mock the situation, never the player.** The app is self-aware, not mean.
3. **Errors stay clear.** Network errors are plain English; humor lives in flavor only.
4. **Never lie about game state.** Score is score. Flavor is flavor.

## Contributing

Contributions, bug reports, and especially **new quips** are welcome. Add jokes to `quips.ts`, open a PR, profit.

## License

[MIT](LICENSE) — do what you like, just don't blame us when you lose to Rookie.
