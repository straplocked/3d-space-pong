# Online play — scope (research only, no code)

Chris asked for a scoping pass on real-time online multiplayer. Today the only multiplayer mode is **2P local** — two people, one keyboard, one device. This doc lays out the options, what each would cost in engine changes and infrastructure, and a phased recommendation. Nothing here has been built; it's a decision aid.

## Where we start from

- The game loop is **variable-timestep**: `PongGame.tick()` runs off `renderer.setAnimationLoop`, computing `dt` from wall-clock deltas each frame (see [game-engine-physics.md](../technical/web/game-engine-physics.md)). That's fine for a single machine rendering its own frames, but it is **not** deterministic across two machines — the same inputs replayed on two different frame-rate traces will not produce bit-identical ball trajectories.
- There is currently **no gameplay validation on the server**. `POST /api/matches` accepts `{ userId, difficulty, outcome, playerScore, aiScore, durationMs }` and trusts it — see [api-reference.md](../technical/server/api-reference.md). A malicious client can already POST a fabricated win today, without playing a frame. This matters for the discussion below: online play doesn't introduce cheating risk to the leaderboard from nothing — it's already present for the existing AI-match reporting path.
- Deployment is one container, one process, SQLite, no external services, no WebSocket server today ([architecture-at-a-glance.md](./architecture-at-a-glance.md)). Every option below is evaluated partly on how much it erodes that footprint, since "zero ops, self-hostable by one person" is a stated product value ([executive-summary.md](./executive-summary.md)).
- The reverse-proxy layer (NPM, per the deployment notes) already has WebSockets enabled, so a WS-based option adds no new proxy configuration — only new application surface.

## Options

### A. WebRTC P2P, 1v1, Fastify does only signalling

Two players' browsers connect directly to each other; the server's job is limited to exchanging SDP offers/answers and ICE candidates so the peer connection can be established (a small addition to the existing Fastify app, or a lightweight WS endpoint on it).

- **Latency**: best case of the three — one hop between players, no server relay once connected.
- **Cheating resistance**: weakest. Either peer could run a modified client. Acceptable for a casual "betray a friend" context; not acceptable if the leaderboard is meant to mean something competitively.
- **Engine changes**: still needs a deterministic fixed-tick simulation (see below) and some combination of input delay and interpolation/rollback so the two peers agree on ball position despite ~20-150ms of link latency between home internet connections.
- **Infra impact**: the signalling channel is cheap (fits in the existing Fastify process). The hard part is NAT traversal — a STUN server is required (there are free public ones, e.g. Google's, usable for a v1), and a **TURN** relay is needed as a fallback for the subset of pairs behind symmetric NAT or restrictive firewalls who can't form a direct P2P path (industry estimates put this around 10-20% of consumer connections). TURN relay is the one piece that doesn't fit the "no external services" story — it either means running a TURN server (new container, ongoing bandwidth cost proportional to usage) or depending on a third-party TURN provider. A v1 could ship *without* TURN and accept that some pairs simply can't connect, with a clear error message — deferring the TURN cost until it's shown to matter.

### B. Authoritative server over WebSocket

The Fastify server (or a dedicated process) runs the simulation; both clients send inputs, the server resolves physics and broadcasts authoritative state.

- **Latency**: worse than P2P by definition — every input takes a round trip to the server before its effect is visible — but *consistent* latency is easier to mask with client-side prediction than P2P's end-to-end variability.
- **Cheating resistance**: strong. The server is the source of truth for ball position and score; a client can only lie about its own inputs (moving a paddle faster than allowed is rejected server-side), not about outcomes. This is the only option that makes the leaderboard trustworthy again.
- **Engine changes**: the physics step (`updateBall`, `updatePaddles`, collision resolution — [game-engine-physics.md](../technical/web/game-engine-physics.md)) needs to be extracted into something that can run headless on the server at a fixed tick rate, decoupled from `three.js` and `requestAnimationFrame`. The client keeps its own copy for prediction (render what you think is happening) and reconciles against authoritative snapshots from the server (smoothly correct when wrong). This is a real refactor, not a config flag — today the simulation and the renderer are one class.
- **Infra impact**: no NAT traversal problem (both clients only ever talk to the server, which has a public address already). Fits the "one container, one port" story as long as match state is kept **in-memory** and stays single-node — which is true today and would remain true unless the product ever needed multiple server instances behind a load balancer (not currently the case; see [operational-footprint.md](./operational-footprint.md)). If it ever did, in-memory match state would need a shared layer (e.g. Redis) to survive a client being routed to a different node mid-match — a genuine new dependency, but only relevant past a scale this product isn't targeting.

### C. Rooms / matchmaking

Not a standalone transport choice — this is a layer on top of option B (an authoritative server is the natural place to own room state, queue players, and run a match). Covers: a lobby, "find a match," reconnect-after-disconnect, maybe a simple rating so matchmaking pairs similar skill.

- Brings its own scope: presence tracking, disconnect/reconnect handling (what happens to a match if someone's phone locks?), and probably an expansion of the `users` table or a new `sessions`-type concept.
- Only makes sense once B exists and once there's evidence people want to play against strangers, not just friends — see recommendation below.

## Trade-off summary

| | P2P (A) | Authoritative server (B) | + Rooms/matchmaking (C) |
| --- | --- | --- | --- |
| Latency | Best | Good (consistent, maskable) | Same as B |
| Cheat resistance | Weak | Strong | Strong |
| New infra | STUN (free) + optional TURN (cost) | None beyond existing container | Same as B, more server state |
| Engine work | Deterministic tick + rollback/interpolation | Deterministic tick + server-authoritative physics + client prediction/reconciliation | Same as B + lobby/session logic |
| Fits "zero ops, one container" story | Mostly (TURN is the exception) | Yes, while single-node | Yes, while single-node |
| Who it's really for | Playing with a specific friend (matches "Betray a Friend" today) | Any 1v1, trustable leaderboard | Strangers / ranked play |

## Phased recommendation

1. **Don't build this yet without a clear signal of demand.** The product's value proposition (self-hosted, zero ops, one person runs it for their friends) is in tension with *any* online-multiplayer investment — it's the first feature that would require the engine to become network-aware at all. Treat this doc as scoping for a future decision, not a greenlight.
2. **If pursued, start with Phase 1 = Option A (WebRTC P2P + Fastify signalling), no TURN.** It's the smallest step that delivers "play against a friend over the internet," it reuses the existing single-container deployment almost as-is, and it matches the existing trust model (2P local already assumes the two players aren't trying to cheat each other for leaderboard standing — 2P matches aren't even recorded today, per [leaderboard-guide.md](../user/leaderboard-guide.md)). Rough sizing: **M** (roughly 2-4 weeks for one engineer) — deterministic fixed-tick refactor, basic input-delay/interpolation netcode, signalling endpoint, STUN config, connection-failure UX.
3. **Only escalate to Phase 2 = Option B (authoritative server) if online matches are meant to count toward the Hall of Fame / Hall of Shame.** That's the real fork in the road: an authoritative server is the only option that makes an online win or loss as trustworthy as an AI match's (which is itself only as trustworthy as an unvalidated POST body, today). If online results should ever feed the same leaderboard that currently has a "receipts" brand identity, skipping straight to B is more honest than shipping A and bolting on trust later. Rough sizing: **L** (roughly 4-8 weeks) — physics extraction to a headless/shared simulation, server tick loop, client prediction + reconciliation, WS transport.
4. **Phase 3 = Option C (rooms/matchmaking) is speculative and out of scope until 1v1 online play (whichever phase ships) has real usage.** Don't size it yet.

## Open question for Chris

Should online matches (if built) write to the same Hall of Fame / Hall of Shame as AI matches, or a separate leaderboard? That answer decides whether Phase 1 (P2P, cheap, fun, not very trustworthy) is an acceptable permanent state or just a stepping stone to Phase 2.
