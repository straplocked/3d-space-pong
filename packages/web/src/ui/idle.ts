/**
 * Idle-timeout watcher.
 *
 * After `timeoutMs` milliseconds of no user interaction, fires the
 * `onIdle` callback. Resets its countdown on any keydown, mousedown,
 * touchstart, or mousemove.
 *
 * The watcher can be paused (e.g., during active gameplay or attract
 * mode where it shouldn't fire) and resumed when the user returns to
 * a route where idle-to-attract makes sense.
 */

const EVENTS: (keyof WindowEventMap)[] = [
  "keydown",
  "mousedown",
  "touchstart",
  "mousemove",
  "pointerdown",
];

export interface IdleWatcherHandle {
  /** Pause the idle countdown (e.g., during gameplay). */
  pause(): void;
  /** Resume the idle countdown, resetting the timer from now. */
  resume(): void;
  /** Tear down all listeners permanently. */
  destroy(): void;
}

export function startIdleWatcher(opts: {
  timeoutMs: number;
  onIdle: () => void;
}): IdleWatcherHandle {
  const { timeoutMs, onIdle } = opts;
  let timer: number | null = null;
  let paused = false;
  let destroyed = false;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const resetTimer = () => {
    if (paused || destroyed) return;
    clearTimer();
    timer = window.setTimeout(() => {
      if (!paused && !destroyed) onIdle();
    }, timeoutMs);
  };

  const onActivity = () => {
    resetTimer();
  };

  for (const evt of EVENTS) {
    window.addEventListener(evt, onActivity, { passive: true });
  }

  // Start the initial countdown.
  resetTimer();

  return {
    pause() {
      paused = true;
      clearTimer();
    },
    resume() {
      paused = false;
      resetTimer();
    },
    destroy() {
      destroyed = true;
      clearTimer();
      for (const evt of EVENTS) {
        window.removeEventListener(evt, onActivity);
      }
    },
  };
}
