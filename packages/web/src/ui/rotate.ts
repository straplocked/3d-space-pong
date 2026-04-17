/**
 * "Please rotate to landscape" overlay for mobile.
 * Auto-mounted by the game route; watches window resize/orientationchange
 * and shows itself whenever the device is a touch device AND in portrait.
 */
import { isTouchDevice, isPortrait } from "./fullscreen.js";

export interface RotateHandle {
  destroy(): void;
}

export function mountRotatePrompt(): RotateHandle {
  if (!isTouchDevice()) {
    return { destroy: () => {} };
  }

  const overlay = document.createElement("div");
  overlay.className = "rotate-overlay";
  overlay.innerHTML = `
    <div class="rotate-card">
      <div class="rotate-icon" aria-hidden="true">
        <span class="rotate-phone"></span>
      </div>
      <div class="rotate-title">Rotate to Landscape</div>
      <div class="rotate-tagline">// Pong is best played sideways.</div>
    </div>
  `;
  document.body.appendChild(overlay);

  const update = () => {
    overlay.classList.toggle("visible", isPortrait());
  };

  update();
  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", update);

  return {
    destroy() {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      overlay.remove();
    },
  };
}
