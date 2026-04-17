import type { Difficulty } from "@3d-pong/shared";
import { DIFFICULTY_PROFILES } from "../game/AI.js";

export interface HudHandle {
  setScore(left: number, right: number): void;
  destroy(): void;
}

export function mountHud(opts: {
  mode: "ai" | "2p";
  difficulty?: Difficulty;
  onPause: () => void;
}): HudHandle {
  const hud = document.createElement("div");
  hud.className = "hud";

  const modeLabel =
    opts.mode === "2p"
      ? `<div class="hud-mode">2P LOCAL<span class="subtitle">Betray a friend</span></div>`
      : (() => {
          const profile = opts.difficulty
            ? DIFFICULTY_PROFILES[opts.difficulty]
            : null;
          return profile
            ? `<div class="hud-mode">VS ${profile.name.toUpperCase()}<span class="subtitle">${profile.subtitle}</span></div>`
            : `<div class="hud-mode">VS AI</div>`;
        })();

  const controls =
    opts.mode === "2p"
      ? "P1: W / S &nbsp;·&nbsp; P2: ↑ / ↓ &nbsp;·&nbsp; ESC"
      : "MOVE: W / S or DRAG &nbsp;·&nbsp; ESC";

  hud.innerHTML = `
    ${modeLabel}
    <button type="button" class="hud-pause-btn" data-action="pause" aria-label="Pause">
      <span class="pause-glyph" aria-hidden="true">
        <span></span><span></span>
      </span>
      <span class="pause-label">PAUSE</span>
    </button>
    <div class="hud-score">
      <span id="score-left">0</span>
      <span class="sep">·</span>
      <span id="score-right">0</span>
    </div>
    <div class="hud-controls">${controls}</div>
  `;
  document.body.appendChild(hud);

  const left = hud.querySelector<HTMLSpanElement>("#score-left");
  const right = hud.querySelector<HTMLSpanElement>("#score-right");
  const pauseBtn = hud.querySelector<HTMLButtonElement>(
    '[data-action="pause"]',
  );

  // Both click (mouse/keyboard) and touchstart (fast mobile response)
  // trigger pause. Prevent the touch from bubbling up to the game's
  // touch-drag handler on window.
  const handlePause = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    opts.onPause();
  };
  pauseBtn?.addEventListener("click", handlePause);
  pauseBtn?.addEventListener("touchstart", handlePause, { passive: false });

  return {
    setScore(l, r) {
      if (left) left.textContent = String(l);
      if (right) right.textContent = String(r);
    },
    destroy() {
      hud.remove();
    },
  };
}
