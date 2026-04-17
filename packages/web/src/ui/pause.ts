/**
 * In-game pause overlay.
 * Rendered above the game canvas and HUD, with Resume and Quit buttons.
 * Styled like a terminal dialog to match the rest of the UI.
 */
export interface PauseHandle {
  dismiss(): void;
}

export function showPauseOverlay(opts: {
  onResume: () => void;
  onQuit: () => void;
}): PauseHandle {
  // Don't stack multiple overlays if one is already up.
  const existing = document.getElementById("pause-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "pause-overlay";
  overlay.className = "pause-overlay";
  overlay.innerHTML = `
    <section class="card pause-card">
      <h1>Paused</h1>
      <p class="tagline">Execution suspended. Resume or quit.</p>
      <button class="btn" data-action="resume">Resume</button>
      <button class="btn btn-secondary" data-action="quit">Quit to Menu</button>
    </section>
  `;
  document.body.appendChild(overlay);

  const dismiss = () => overlay.remove();

  overlay
    .querySelector('[data-action="resume"]')
    ?.addEventListener("click", () => {
      dismiss();
      opts.onResume();
    });
  overlay
    .querySelector('[data-action="quit"]')
    ?.addEventListener("click", () => {
      dismiss();
      opts.onQuit();
    });

  return { dismiss };
}
