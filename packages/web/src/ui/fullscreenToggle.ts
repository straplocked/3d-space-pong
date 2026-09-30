/**
 * Small "go fullscreen" button, mounted into the menu card and the in-game
 * HUD. Hidden entirely when the Fullscreen API isn't available, or when the
 * app is already running installed (homescreen/desktop) in its own
 * fullscreen/standalone window — there's no browser chrome to hide there,
 * so the toggle would have nothing useful to do.
 */
import {
  isFullscreenSupported,
  isInstalledDisplayMode,
  isFullscreenActive,
  toggleFullscreen,
} from "./fullscreen.js";

export interface FullscreenToggleHandle {
  destroy(): void;
}

export function mountFullscreenToggle(
  container: HTMLElement,
  opts: { className?: string } = {},
): FullscreenToggleHandle {
  if (!isFullscreenSupported() || isInstalledDisplayMode()) {
    return { destroy: () => {} };
  }

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = opts.className ?? "fullscreen-toggle";
  btn.dataset.action = "fullscreen";
  btn.setAttribute("aria-label", "Toggle fullscreen");

  const render = () => {
    const active = isFullscreenActive();
    btn.setAttribute("aria-pressed", active ? "true" : "false");
    btn.innerHTML = `
      <span class="fullscreen-icon" aria-hidden="true">${active ? "⤢" : "⛶"}</span>
      <span class="fullscreen-label">${active ? "EXIT FULLSCREEN" : "FULLSCREEN"}</span>
    `;
  };
  render();

  const onClick = async (e: Event) => {
    e.preventDefault();
    await toggleFullscreen();
    render();
  };
  btn.addEventListener("click", onClick);

  // Fullscreen can also be exited via Escape / browser UI outside our
  // button — keep the label in sync either way.
  const onChange = () => render();
  document.addEventListener("fullscreenchange", onChange);
  document.addEventListener("webkitfullscreenchange", onChange);

  container.appendChild(btn);

  return {
    destroy() {
      btn.removeEventListener("click", onClick);
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      btn.remove();
    },
  };
}
