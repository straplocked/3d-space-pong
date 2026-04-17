import { go } from "../router.js";
import { sfx } from "../audio/sound.js";

export function renderMenu(root: HTMLElement): void {
  const audioOn = sfx.isEnabled();
  root.innerHTML = `
    <section class="card">
      <button
        type="button"
        class="audio-toggle"
        data-action="audio"
        aria-label="Toggle sound"
        aria-pressed="${audioOn ? "true" : "false"}"
      >
        <span class="audio-icon" aria-hidden="true">${audioOn ? "♪" : "×"}</span>
        <span class="audio-label">SOUND: ${audioOn ? "ON" : "OFF"}</span>
      </button>
      <h1>3D SPACE PONG</h1>
      <p class="tagline">A pong game that keeps receipts.</p>
      <button class="btn" data-action="ai">Fight The Machine</button>
      <button class="btn" data-action="2p">Betray a Friend</button>
      <button class="btn btn-secondary" data-action="leaderboard">Hall of Shame</button>
      <hr class="menu-divider" />
      <div class="menu-row">
        <button class="btn btn-tertiary" data-action="tuning">GFX Tuning</button>
        <button class="btn btn-tertiary" data-action="attract">Attract Mode</button>
      </div>
    </section>
  `;

  root.querySelector('[data-action="ai"]')?.addEventListener("click", () => {
    sfx.menuSelect();
    go("/signup");
  });
  root.querySelector('[data-action="2p"]')?.addEventListener("click", () => {
    sfx.menuSelect();
    go("/game?mode=2p");
  });
  root
    .querySelector('[data-action="leaderboard"]')
    ?.addEventListener("click", () => {
      sfx.menuBlip();
      go("/leaderboard");
    });
  root
    .querySelector('[data-action="tuning"]')
    ?.addEventListener("click", () => {
      sfx.menuBlip();
      go("/tuning");
    });
  root
    .querySelector('[data-action="attract"]')
    ?.addEventListener("click", () => {
      sfx.menuBlip();
      go("/attract");
    });

  const audioBtn = root.querySelector<HTMLButtonElement>(
    '[data-action="audio"]',
  );
  audioBtn?.addEventListener("click", () => {
    const next = !sfx.isEnabled();
    sfx.setEnabled(next);
    if (next) sfx.menuBlip(); // give instant confirmation when turning on
    // Re-render to update the label/icon.
    renderMenu(root);
  });
}
