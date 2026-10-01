import { test, expect } from "@playwright/test";
import {
  gotoMenu,
  start2pMatch,
  stubWakeLock,
  wakeLockLog,
  expectEngineErrorCard,
} from "./support/helpers.js";

test("screen wake lock is requested during a match and released after quitting", async ({
  page,
}) => {
  await stubWakeLock(page);
  await gotoMenu(page);
  const outcome = await start2pMatch(page);

  if (outcome === "engine-error") {
    await expectEngineErrorCard(page);
    test.info().annotations.push({
      type: "webgl-fallback",
      description:
        "WebGL unavailable; the /game route never reaches holdScreenAwake() in that case.",
    });
    return;
  }

  await expect(page.locator(".hud")).toBeVisible();
  await expect.poll(() => wakeLockLog(page)).toContain("request:screen");

  // Quit the match via the pause menu (src/ui/pause.ts) so main.ts's
  // /game route handler runs its teardown, which calls
  // activeWakeLock.release() (see src/main.ts).
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause-overlay")).toBeVisible();
  await page.locator('[data-action="quit"]').click();

  await expect.poll(() => wakeLockLog(page)).toContain("release");
});
