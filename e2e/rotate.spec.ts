import { test, expect } from "@playwright/test";
import { gotoMenu, start2pMatch, expectEngineErrorCard } from "./support/helpers.js";

// Phone context: coarse pointer + touch, so the app-wide orientation guard
// (packages/web/src/ui/rotate.ts) actually enforces landscape instead of
// being a no-op (it only activates on "(pointer: coarse)" touch devices).
test.use({
  viewport: { width: 844, height: 390 }, // phone, landscape
  hasTouch: true,
  isMobile: true,
});

test("no rotate overlay in landscape; appears in portrait and pauses a running match; hides again back in landscape", async ({
  page,
}) => {
  await gotoMenu(page);
  await expect(page.locator(".rotate-overlay")).not.toBeVisible();

  const outcome = await start2pMatch(page);
  if (outcome === "engine-error") {
    await expectEngineErrorCard(page);
    test.info().annotations.push({
      type: "webgl-fallback",
      description:
        "WebGL unavailable; verified the overlay show/hide below without a live match to pause.",
    });
  } else {
    await expect(page.locator("#game-canvas")).toHaveClass(/active/);
  }

  // Rotate to portrait.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".rotate-overlay")).toBeVisible();

  if (outcome === "hud") {
    // main.ts subscribes the live match to orientation.onChange and pauses
    // it when the guard reports "blocked".
    await expect(page.locator("#pause-overlay")).toBeVisible();
  }

  // Rotate back to landscape.
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(".rotate-overlay")).not.toBeVisible();
});
