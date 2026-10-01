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
 *     exit fullscreen — but only if the game entered fullscreen itself.
 *     Fullscreen the player turned on (menu toggle, GO FULLSCREEN offer)
 *     is theirs and stays on across every route change.
 */

/** True while fullscreen is on because a match started it, not the player. */
let autoEnteredForGameplay = false;

/**
 * True when the current fullscreen session was started automatically by
 * enterGameplayViewport() (so leaving the game should release it), false
 * when the player chose fullscreen themselves.
 */
export function isFullscreenAutoEntered(): boolean {
  return autoEnteredForGameplay && isFullscreenActive();
}

if (typeof document !== "undefined") {
  // Escape / browser UI / system back can drop fullscreen behind our back;
  // a stale flag would make the next manual fullscreen look automatic.
  const resetIfExited = () => {
    if (!isFullscreenActive()) autoEnteredForGameplay = false;
  };
  document.addEventListener("fullscreenchange", resetIfExited);
  document.addEventListener("webkitfullscreenchange", resetIfExited);
}

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
  if (!isFullscreenActive()) {
    // Set before the await: the fullscreenchange listeners (main.ts routes a
    // manual fullscreen into attract mode) fire before enterFullscreen resolves.
    autoEnteredForGameplay = true;
    await enterFullscreen();
    if (!isFullscreenActive()) autoEnteredForGameplay = false;
  }
  // Fullscreen transition can take a tick before orientation lock works.
  await new Promise((r) => setTimeout(r, 60));
  await lockLandscape();
}

/** Convenience: call when leaving gameplay. */
export async function leaveGameplayViewport(): Promise<void> {
  if (!isTouchDevice()) return;
  // Fullscreen the player chose stays on (and stays landscape) after a match.
  if (!autoEnteredForGameplay) return;
  autoEnteredForGameplay = false;
  unlockOrientation();
  await exitFullscreen();
}

/** True if the Fullscreen API (standard or webkit-prefixed) exists at all. */
export function isFullscreenSupported(): boolean {
  const anyDoc = document as Document & {
    webkitFullscreenEnabled?: boolean;
  };
  return !!(
    document.fullscreenEnabled ||
    anyDoc.webkitFullscreenEnabled ||
    typeof document.documentElement.requestFullscreen === "function"
  );
}

/** True if *any* element on the page is currently the fullscreen element. */
export function isFullscreenActive(): boolean {
  const anyDoc = document as Document & {
    webkitFullscreenElement?: Element | null;
  };
  return !!(document.fullscreenElement || anyDoc.webkitFullscreenElement);
}

/**
 * True when the app is already running "installed" in its own top-level
 * window — launched from a homescreen/desktop icon as a fullscreen or
 * standalone PWA (per our manifest's `display_override`). In that mode a
 * manual fullscreen toggle is redundant (there's no browser chrome to hide),
 * so callers use this to hide the button.
 */
export function isInstalledDisplayMode(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return (
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

/** Toggle fullscreen on <html>, swallowing any rejection (denied/blocked). */
export async function toggleFullscreen(): Promise<void> {
  // A manual toggle always makes fullscreen the player's own.
  autoEnteredForGameplay = false;
  if (isFullscreenActive()) {
    await exitFullscreen();
  } else {
    await enterFullscreen();
    // Best-effort landscape lock once the fullscreen transition settles;
    // errors (unsupported / not permitted outside a user gesture) are
    // swallowed inside lockLandscape itself.
    await new Promise((r) => setTimeout(r, 60));
    await lockLandscape();
  }
}
