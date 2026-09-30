/**
 * Screen Wake Lock for the duration of a match, so a phone doesn't dim and
 * lock mid-rally (touch play is drag-driven, and some OS idle timers only
 * count taps). Best-effort: unsupported browsers and denied requests are
 * silently ignored. The OS drops the lock whenever the page is hidden, so
 * we re-request it when the page becomes visible again.
 */

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

interface NavigatorWithWakeLock {
  wakeLock?: { request(type: "screen"): Promise<WakeLockSentinelLike> };
}

export interface WakeLockHandle {
  release(): void;
}

export function holdScreenAwake(): WakeLockHandle {
  const wl = (navigator as NavigatorWithWakeLock).wakeLock;
  if (!wl) return { release: () => {} };

  let sentinel: WakeLockSentinelLike | null = null;
  let released = false;

  const acquire = async () => {
    if (released || document.visibilityState !== "visible") return;
    try {
      const s = await wl.request("screen");
      if (released) void s.release();
      else sentinel = s;
    } catch {
      // Denied (battery saver, iframe policy) — not fatal.
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") void acquire();
  };

  void acquire();
  document.addEventListener("visibilitychange", onVisibility);

  return {
    release() {
      released = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    },
  };
}
