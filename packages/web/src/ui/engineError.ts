/**
 * Shown when the 3D engine can't start: the lazily-loaded engine chunk
 * failed to download (offline before it was ever cached), or the browser
 * refused a WebGL context (disabled GPU, blocklisted driver, too many
 * contexts on a low-memory phone). Plain, actionable copy — no jokes in
 * error messages (see the rule at the top of content/quips.ts).
 */
import { go } from "../router.js";

function describe(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/webgl/i.test(msg)) {
    return "This browser could not create a WebGL context. Check that hardware acceleration is enabled, close other tabs using 3D graphics, and try again.";
  }
  if (!navigator.onLine) {
    return "The game engine has not been downloaded yet and this device is offline. Reconnect once to cache it for offline play.";
  }
  return "The game engine failed to load. Reload the page to try again.";
}

export function renderEngineError(root: HTMLElement, err: unknown): void {
  console.error("Engine failed to start:", err);
  document.getElementById("game-canvas")?.classList.remove("active");
  root.innerHTML = `
    <section class="card engine-error">
      <h1>Can't Start Game</h1>
      <p class="tagline"></p>
      <button class="btn" data-action="reload">Reload</button>
      <button class="btn btn-secondary" data-action="menu">Back to Menu</button>
    </section>
  `;
  const tagline = root.querySelector<HTMLElement>(".tagline");
  if (tagline) tagline.textContent = describe(err);
  root
    .querySelector('[data-action="reload"]')
    ?.addEventListener("click", () => location.reload());
  root
    .querySelector('[data-action="menu"]')
    ?.addEventListener("click", () => go("/menu"));
}
