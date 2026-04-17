import type { Difficulty } from "@3d-pong/shared";
import { pickGameOverQuip } from "../content/quips.js";
import { go } from "../router.js";

export interface GameOverProps {
  outcome: "win" | "loss";
  playerScore: number;
  aiScore: number;
  mode: "ai" | "2p";
  difficulty?: Difficulty;
}

export function renderGameOver(root: HTMLElement, props: GameOverProps): void {
  const quip = pickGameOverQuip({
    outcome: props.outcome,
    difficulty: props.difficulty ?? "rookie",
    vsAI: props.mode === "ai",
  });

  const headline =
    props.mode === "2p"
      ? props.outcome === "win"
        ? "PLAYER 1 WINS"
        : "PLAYER 2 WINS"
      : props.outcome === "win"
        ? "VICTORY"
        : "DEFEAT";

  const replayHash =
    props.mode === "2p"
      ? "/game?mode=2p"
      : `/game?mode=ai&difficulty=${props.difficulty ?? "rookie"}`;

  root.innerHTML = `
    <section class="card game-over">
      <div class="result ${props.outcome}">${headline}</div>
      <div class="final-score">${props.playerScore} — ${props.aiScore}</div>
      <p class="quip">${escapeHtml(quip)}</p>
      <button class="btn" data-action="replay">Play Again</button>
      <button class="btn btn-secondary" data-action="menu">Back to Menu</button>
      ${
        props.mode === "ai"
          ? `<button class="btn btn-secondary" data-action="leaderboard">View Leaderboard</button>`
          : ""
      }
    </section>
  `;

  root
    .querySelector('[data-action="replay"]')
    ?.addEventListener("click", () => go(replayHash));
  root
    .querySelector('[data-action="menu"]')
    ?.addEventListener("click", () => go("/menu"));
  root
    .querySelector('[data-action="leaderboard"]')
    ?.addEventListener("click", () => go("/leaderboard"));
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
