# Executive summary

## The product

**3D Space Pong** is a browser-based 3D Pong game with persistent match tracking and a deliberately sharp comedic voice. Players sign up once, pick one of five AI difficulty levels, and every match result lands on a shared leaderboard — including losses. The tagline is literal: *a pong game that keeps receipts*.

## What makes it worth shipping

- **Persistent humiliation as a feature.** Lose to the "Rookie" AI once and you carry a 🙈 ROOKIE VICTIM badge for life. This is intentional. It drives return play and shareability better than a conventional leaderboard.
- **Humor everywhere, but decoupled from code.** All player-facing flavor text lives in one file (`quips.ts`). Non-engineers can contribute lines without touching game logic.
- **Zero operational complexity.** Single container, embedded SQLite, single-file database. No external services required.
- **Self-hostable in minutes** on any machine that runs Docker — including Unraid and hobbyist NAS boxes. Designed to be run by one person for their friends.
- **Mobile-aware.** Touch controls map finger position to paddle position 1:1. Landscape enforced app-wide on phones (lock where the browser allows, a rotate overlay everywhere else), auto-pause on app switch or rotation, screen kept awake during matches, and an in-app install button for the PWA.

## Technical one-liner

TypeScript monorepo — **three.js** front-end with procedural bloom/fog/particle effects, **Fastify + Drizzle ORM + SQLite** back-end, shared **zod** validation between them. Deployed as a **single Node.js container**.

## Status

The initial build is committed and runnable. Attract mode, 1P vs 5 AI levels, 2P local, sign-up, leaderboard, game-over screen, GFX tuning panel, mobile fullscreen + app-wide landscape enforcement, installable PWA with offline 2P, procedural Web Audio SFX — all implemented. The 3D engine is lazy-loaded, so the initial download is ~104 kB of JS instead of ~614 kB. Hall-of-Shame seeder pre-populates the leaderboard on first boot so day-one isn't empty.

## What's intentionally out of scope

- No accounts service, OAuth, or cross-device login. Email is the unique key; device-local storage carries the session.
- No Postgres adapter in this build (the Drizzle layer would support it, but it is not wired up).
- No WebSocket / real-time multiplayer. 2P is strictly local-couch. Scoped (not built) — see [online-play-scope.md](./online-play-scope.md).
- No social-graph features (no following, no sharing a profile URL).
