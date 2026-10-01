/**
 * Test-only instrumentation surface for the Playwright suite (see
 * ../../../e2e at the repo root).
 *
 * `window.__E2E_HOOKS__` only exists when a Playwright test pre-seeds it
 * via `addInitScript` *before* the app's own scripts run. A real player's
 * browser never defines this global, so `reportFrame` below is always a
 * single property read that returns `undefined` and bails — the WebGL
 * render loop pays nothing extra and no behavior changes. This file ships
 * in the production bundle inert.
 */
export interface E2EHooks {
  /** Incremented once per rendered frame while a PongGame instance is running. */
  frame: number;
  leftScore: number;
  rightScore: number;
}

declare global {
  interface Window {
    __E2E_HOOKS__?: E2EHooks;
  }
}

/** Called from PongGame's render tick. No-op unless a test seeded the hook. */
export function reportFrame(leftScore: number, rightScore: number): void {
  const hooks = window.__E2E_HOOKS__;
  if (!hooks) return;
  hooks.frame = (hooks.frame ?? 0) + 1;
  hooks.leftScore = leftScore;
  hooks.rightScore = rightScore;
}
