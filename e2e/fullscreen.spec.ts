import { test, expect } from "@playwright/test";
import { gotoMenu } from "./support/helpers.js";

// Task 847: fullscreen entered from the menu starts attract mode and
// stays on; dismissing attract (any click) returns to the menu without
// dropping fullscreen. Headless Chromium supports requestFullscreen from
// a real (Playwright-dispatched) click, which counts as user activation.
test("fullscreen from the menu lands on attract mode and survives dismissing it", async ({
  page,
}) => {
  await gotoMenu(page);

  const fullscreenBtn = page.locator('[data-action="fullscreen"]');
  await expect(fullscreenBtn).toBeVisible();
  await fullscreenBtn.click();

  await expect(page).toHaveURL(/#\/attract$/);
  await expect
    .poll(() => page.evaluate(() => !!document.fullscreenElement))
    .toBe(true);

  // Attract mode arms its dismiss listeners ~250ms after mounting so the
  // click that landed us here doesn't immediately bounce back out.
  await page.waitForTimeout(400);
  await page.mouse.click(10, 10);

  await expect(page).toHaveURL(/#\/menu$/);
  expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
});
