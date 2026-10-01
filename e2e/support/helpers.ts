import { expect, type Page } from "@playwright/test";

/**
 * Seeds `window.__E2E_HOOKS__` before any of the app's own scripts run
 * (`addInitScript` fires on every subsequent navigation/reload in this
 * page too). PongGame's render loop only reports frame/score data into
 * this object when it already exists — see packages/web/src/testHooks.ts.
 */
export async function seedFrameHook(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __E2E_HOOKS__: unknown }).__E2E_HOOKS__ = {
      frame: 0,
      leftScore: 0,
      rightScore: 0,
    };
  });
}

/** Navigates straight to the menu route (bypassing attract mode's default
 *  boot route) and waits for the card to render. */
export async function gotoMenu(page: Page): Promise<void> {
  await seedFrameHook(page);
  await page.goto("/#/menu");
  await page.locator(".card h1").waitFor({ state: "visible" });
}

/**
 * Stubs `navigator.wakeLock` before the app loads, recording every
 * request/release into `window.__wakeLockLog` so tests can assert on it.
 * Real (non-test) pages never touch this — it's only installed by the
 * Playwright context via `addInitScript`.
 */
export async function stubWakeLock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const log: string[] = [];
    (window as unknown as { __wakeLockLog: string[] }).__wakeLockLog = log;
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: {
        request: async (type: string) => {
          log.push(`request:${type}`);
          return {
            release: async () => {
              log.push("release");
            },
          };
        },
      },
    });
  });
}

export async function wakeLockLog(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __wakeLockLog?: string[] }).__wakeLockLog ?? [],
  );
}

export async function frameHook(
  page: Page,
): Promise<{ frame: number; leftScore: number; rightScore: number }> {
  return page.evaluate(
    () =>
      (
        window as unknown as {
          __E2E_HOOKS__: { frame: number; leftScore: number; rightScore: number };
        }
      ).__E2E_HOOKS__,
  );
}

export type MatchStart = "hud" | "engine-error";

/**
 * Clicks a menu action that starts a match (2P local by default) and waits
 * for either the in-game HUD (WebGL/engine started fine) or the "Can't
 * Start Game" error card (no usable WebGL context in this browser) to
 * show up. Headless Chromium needs `--use-gl=swiftshader
 * --enable-unsafe-swiftshader` (set in playwright.config.ts) to get a real
 * context at all; this helper lets a test degrade gracefully to asserting
 * the error card instead of hanging if that ever stops being true.
 */
export async function start2pMatch(page: Page): Promise<MatchStart> {
  await page.locator('[data-action="2p"]').click();
  const hud = page.locator(".hud");
  const errorCard = page.locator(".engine-error");
  await Promise.race([
    hud.waitFor({ state: "visible", timeout: 15_000 }),
    errorCard.waitFor({ state: "visible", timeout: 15_000 }),
  ]);
  return (await errorCard.isVisible()) ? "engine-error" : "hud";
}

/** Asserts the readable fallback card shown when the 3D engine can't
 *  start, and returns the tagline text for the caller to log/annotate. */
export async function expectEngineErrorCard(page: Page): Promise<void> {
  await expect(page.locator(".engine-error h1")).toHaveText("Can't Start Game");
}
