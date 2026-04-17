/**
 * Fullscreen + orientation helpers for mobile gameplay.
 *
 * Strategy:
 *   - On game start, if we detect a touch device, try to request fullscreen
 *     on the document element and lock orientation to landscape.
 *   - Orientation lock only works inside a fullscreen context on most
 *     browsers, and is outright unsupported on iOS Safari — we gracefully
 *     fall back to showing a "please rotate" overlay when the user is in
 *     portrait during a match.
 *   - On exit (game over, quit, route change) we release the lock and
 *     exit fullscreen.
 */

export function isTouchDevice(): boolean {
  return (
    (typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0)) ||
    false
  );
}

export function isPortrait(): boolean {
  return window.innerHeight > window.innerWidth;
}

export async function enterFullscreen(
  el: HTMLElement = document.documentElement,
): Promise<void> {
  const anyEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void>;
  };
  const anyDoc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  const alreadyFullscreen =
    document.fullscreenElement || anyDoc.webkitFullscreenElement;
  if (alreadyFullscreen) return;

  try {
    if (typeof el.requestFullscreen === "function") {
      await el.requestFullscreen();
    } else if (typeof anyEl.webkitRequestFullscreen === "function") {
      await anyEl.webkitRequestFullscreen();
    }
  } catch {
    // User denied or browser blocked — not fatal, we'll still play windowed.
  }
}

export async function exitFullscreen(): Promise<void> {
  const anyDoc = document as Document & {
    webkitExitFullscreen?: () => Promise<void>;
    webkitFullscreenElement?: Element | null;
  };
  const inFullscreen =
    document.fullscreenElement || anyDoc.webkitFullscreenElement;
  if (!inFullscreen) return;

  try {
    if (typeof document.exitFullscreen === "function") {
      await document.exitFullscreen();
    } else if (typeof anyDoc.webkitExitFullscreen === "function") {
      await anyDoc.webkitExitFullscreen();
    }
  } catch {
    // Ignore
  }
}

export async function lockLandscape(): Promise<void> {
  const orient = screen.orientation as
    | (ScreenOrientation & {
        lock?: (o: string) => Promise<void>;
      })
    | undefined;
  if (!orient || typeof orient.lock !== "function") return;
  try {
    await orient.lock("landscape");
  } catch {
    // Unsupported (iOS Safari) or not currently in fullscreen — fine.
  }
}

export function unlockOrientation(): void {
  try {
    screen.orientation?.unlock?.();
  } catch {
    // Ignore
  }
}

/** Convenience: call on game start from a user gesture to request both. */
export async function enterGameplayViewport(): Promise<void> {
  if (!isTouchDevice()) return;
  await enterFullscreen();
  // Fullscreen transition can take a tick before orientation lock works.
  await new Promise((r) => setTimeout(r, 60));
  await lockLandscape();
}

/** Convenience: call when leaving gameplay. */
export async function leaveGameplayViewport(): Promise<void> {
  if (!isTouchDevice()) return;
  unlockOrientation();
  await exitFullscreen();
}
