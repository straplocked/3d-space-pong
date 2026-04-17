/**
 * Arcade-style attract mode.
 *
 * Cycles through three phases on loop until the user interacts:
 *   1. TITLE  — big logo + "PRESS START" (5s)
 *   2. DEMO   — AI vs AI gameplay (15s)
 *   3. SHAME  — Hall of Shame table (10s)
 *
 * Any keyboard, mouse, or touch input dismisses the attract mode and
 * routes the user to the main menu. We wait a short beat (250ms) before
 * arming the dismiss listeners so the navigation that landed us here
 * doesn't immediately bounce us out.
 */
import type { LeaderboardRow } from "@3d-space-pong/shared";
import { api } from "../api.js";
import { PongGame } from "../game/PongGame.js";
import { quips } from "../content/quips.js";
import { loadGfxSettings } from "./devpanel.js";

type Phase = "title" | "demo" | "shame";

interface PhaseSpec {
  name: Phase;
  durationMs: number;
}

const PHASES: PhaseSpec[] = [
  { name: "title", durationMs: 5000 },
  { name: "demo", durationMs: 15000 },
  { name: "shame", durationMs: 10000 },
];

export interface AttractHandle {
  dismiss(): void;
}

export function startAttract(opts: {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  onDismiss: () => void;
}): AttractHandle {
  const { root, canvas, onDismiss } = opts;

  let phaseIndex = 0;
  let phaseTimer: number | null = null;
  let demoGame: PongGame | null = null;
  let shameTimer: number | null = null;
  let dismissed = false;
  let leaderboardCache: LeaderboardRow[] | null = null;

  const clearPhaseTimer = () => {
    if (phaseTimer !== null) {
      clearTimeout(phaseTimer);
      phaseTimer = null;
    }
    if (shameTimer !== null) {
      clearInterval(shameTimer);
      shameTimer = null;
    }
  };

  const teardownDemo = () => {
    if (demoGame) {
      demoGame.abort();
      demoGame.dispose();
      demoGame = null;
    }
    canvas.classList.remove("active");
  };

  const renderTitle = () => {
    teardownDemo();
    root.innerHTML = `
      <section class="attract-title">
        <div class="attract-window-chrome">● ● ●  ~/3d-space-pong — attract mode</div>
        <h1 class="attract-logo">3D&nbsp;SPACE&nbsp;PONG</h1>
        <p class="attract-sub">// a pong game that keeps receipts</p>
        <p class="attract-press">PRESS ANY KEY TO START</p>
        <p class="attract-controls">KEYBOARD · MOUSE · TOUCH</p>
      </section>
    `;
  };

  const renderDemo = () => {
    teardownDemo();
    root.innerHTML = `
      <div class="attract-demo-overlay">
        <div class="attract-demo-tag">[ DEMO MODE ]</div>
        <div class="attract-demo-hint">press any key</div>
      </div>
    `;
    canvas.classList.add("active");

    demoGame = new PongGame({
      canvas,
      mode: { kind: "demo", leftDifficulty: "pro", rightDifficulty: "expert" },
      onScoreChange: () => {
        /* ignored in demo */
      },
      onPauseRequested: () => {
        /* demo doesn't pause */
      },
    });
    // Apply saved GFX settings so the demo looks the same as gameplay.
    const savedGfx = loadGfxSettings();
    if (savedGfx) demoGame.applyGfx(savedGfx);
    // Fire and forget — the promise only resolves on abort, which we do
    // ourselves when the phase ends or attract is dismissed.
    void demoGame.start();
  };

  const renderShame = async () => {
    teardownDemo();
    root.innerHTML = `
      <section class="card attract-shame">
        <h1>Hall of Shame</h1>
        <p class="tagline">// all-time losers against the machine</p>
        <div id="attract-shame-body" class="attract-shame-scroll">Loading...</div>
      </section>
    `;

    // Fetch once and cache for subsequent cycles.
    if (!leaderboardCache) {
      try {
        const data = await api.leaderboard({ sort: "losses", limit: 25 });
        leaderboardCache = data.leaderboard;
      } catch {
        leaderboardCache = [];
      }
    }
    if (dismissed || phaseIndex < 0) return;

    const body = root.querySelector<HTMLDivElement>("#attract-shame-body");
    if (!body) return;
    body.innerHTML = renderShameTable(leaderboardCache);

    // Slow auto-scroll so the whole table pans by before the phase ends.
    const inner = body.querySelector<HTMLElement>(".leaderboard-table");
    if (inner && body.scrollHeight > body.clientHeight) {
      const maxScroll = body.scrollHeight - body.clientHeight;
      const durationMs = PHASES[2]!.durationMs - 1500;
      const stepMs = 50;
      const steps = Math.max(1, Math.floor(durationMs / stepMs));
      const perStep = maxScroll / steps;
      let tick = 0;
      shameTimer = window.setInterval(() => {
        tick += 1;
        body.scrollTop = Math.min(maxScroll, tick * perStep);
        if (tick >= steps && shameTimer !== null) {
          clearInterval(shameTimer);
          shameTimer = null;
        }
      }, stepMs);
    }
  };

  const enterPhase = (idx: number) => {
    if (dismissed) return;
    phaseIndex = idx;
    const phase = PHASES[idx]!;
    switch (phase.name) {
      case "title":
        renderTitle();
        break;
      case "demo":
        renderDemo();
        break;
      case "shame":
        void renderShame();
        break;
    }
    phaseTimer = window.setTimeout(() => {
      enterPhase((idx + 1) % PHASES.length);
    }, phase.durationMs);
  };

  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    clearPhaseTimer();
    teardownDemo();
    root.innerHTML = "";
    window.removeEventListener("keydown", onInput, true);
    window.removeEventListener("mousedown", onInput, true);
    window.removeEventListener("touchstart", onInput, true);
    onDismiss();
  };

  const onInput = () => {
    if (dismissed) return;
    dismiss();
  };

  // Start immediately with the title phase.
  enterPhase(0);

  // Arm dismiss listeners after a tiny delay so inbound gestures don't
  // immediately bounce us out.
  window.setTimeout(() => {
    if (dismissed) return;
    window.addEventListener("keydown", onInput, true);
    window.addEventListener("mousedown", onInput, true);
    window.addEventListener("touchstart", onInput, true);
  }, 250);

  return { dismiss };
}

function renderShameTable(rows: LeaderboardRow[]): string {
  if (rows.length === 0) {
    const msg = quips.emptyLeaderboardLosses[0] ?? "No losers yet.";
    return `<div class="empty-state">${escapeHtml(msg)}</div>`;
  }

  return `
    <table class="leaderboard-table">
      <thead>
        <tr>
          <th class="rank">#</th>
          <th class="name">PLAYER</th>
          <th>LOSSES</th>
          <th>FASTEST L</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map((row, i) => {
            const fastest =
              row.shortestLossMs === null
                ? "—"
                : `${(row.shortestLossMs / 1000).toFixed(1)}s`;
            return `
              <tr>
                <td class="rank">${i + 1}</td>
                <td class="name">
                  ${escapeHtml(row.displayName)}
                  ${row.lostToRookie ? '<span class="badge badge-rookie-victim">🙈 ROOKIE VICTIM</span>' : ""}
                  ${row.beatLegend ? '<span class="badge badge-legend-slayer">👑 LEGEND SLAYER</span>' : ""}
                </td>
                <td>${row.losses}</td>
                <td>${fastest}</td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
}
