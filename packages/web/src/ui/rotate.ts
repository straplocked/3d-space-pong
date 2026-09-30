/**
 * App-wide landscape enforcement for touch devices.
 *
 * Mounted once at startup (not per-route). On a coarse-pointer device held
 * in portrait, a full-screen "rotate to landscape" overlay covers every
 * screen — menu, signup, leaderboard and gameplay alike — and subscribers
 * are told so the game route can pause a live match.
 *
 * Where the platform allows it we also try to *lock* landscape:
 *   - Installed PWA (fullscreen/standalone display mode): lock on the first
 *     user gesture; Android Chrome honours this without a fullscreen call.
 *   - Browser tab on Android: the overlay offers a button that enters
 *     fullscreen and locks, since lock() only works inside fullscreen there.
 *   - iOS Safari has no lock API at all, so the overlay is the enforcement.
 */
import {
  enterFullscreen,
  isFullscreenSupported,
  isInstalledDisplayMode,
  isTouchDevice,
  lockLandscape,
} from "./fullscreen.js";

export interface OrientationGuard {
  /** True while the portrait overlay is showing. */
  isBlocked(): boolean;
  /** Subscribe to blocked/unblocked changes; returns an unsubscribe fn. */
  onChange(fn: (blocked: boolean) => void): () => void;
}

const noopGuard: OrientationGuard = {
  isBlocked: () => false,
  onChange: () => () => {},
};

function canLockOrientation(): boolean {
  const orient = screen.orientation as
    | (ScreenOrientation & { lock?: unknown })
    | undefined;
  return !!orient && typeof orient.lock === "function";
}

export function mountOrientationGuard(): OrientationGuard {
  // Only enforce on devices whose primary input is touch. A touchscreen
  // laptop reports maxTouchPoints > 0 but a fine primary pointer.
  const coarse =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  if (!isTouchDevice() || !coarse) return noopGuard;

  const portraitQuery = window.matchMedia("(orientation: portrait)");
  const offerLockButton =
    !isInstalledDisplayMode() && isFullscreenSupported() && canLockOrientation();

  const overlay = document.createElement("div");
  overlay.className = "rotate-overlay";
  overlay.setAttribute("role", "alertdialog");
  overlay.setAttribute("aria-live", "assertive");
  overlay.dataset.ui = "";
  overlay.innerHTML = `
    <div class="rotate-card">
      <div class="rotate-icon" aria-hidden="true">
        <span class="rotate-phone"></span>
      </div>
      <div class="rotate-title">Rotate to Landscape</div>
      <div class="rotate-tagline">// Pong is best played sideways.</div>
      ${
        offerLockButton
          ? `<button type="button" class="btn rotate-lock-btn" data-action="lock-landscape">Go Fullscreen</button>`
          : ""
      }
    </div>
  `;
  document.body.appendChild(overlay);

  overlay
    .querySelector('[data-action="lock-landscape"]')
    ?.addEventListener("click", async () => {
      await enterFullscreen();
      await new Promise((r) => setTimeout(r, 60));
      await lockLandscape();
    });

  const listeners = new Set<(blocked: boolean) => void>();
  let blocked = false;

  const update = () => {
    const next = portraitQuery.matches;
    overlay.classList.toggle("visible", next);
    document.documentElement.classList.toggle("orientation-blocked", next);
    if (next === blocked) return;
    blocked = next;
    for (const fn of listeners) fn(blocked);
  };

  update();
  portraitQuery.addEventListener("change", update);
  // Some older WebViews fire orientationchange before the media query flips.
  window.addEventListener("orientationchange", () => setTimeout(update, 120));

  // Installed PWA: lock on the first gesture (lock() needs user activation).
  if (isInstalledDisplayMode() && canLockOrientation()) {
    const lockOnce = () => {
      void lockLandscape();
      window.removeEventListener("pointerdown", lockOnce);
    };
    window.addEventListener("pointerdown", lockOnce);
  }

  return {
    isBlocked: () => blocked,
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
