import { test, expect } from "@playwright/test";
import { gotoMenu, start2pMatch, expectEngineErrorCard } from "./support/helpers.js";

test("a running match pauses when the document is hidden (visibilitychange)", async ({
  page,
}) => {
  await gotoMenu(page);
  const outcome = await start2pMatch(page);

  if (outcome === "engine-error") {
    await expectEngineErrorCard(page);
    test.info().annotations.push({
      type: "webgl-fallback",
      description: "WebGL unavailable; could not exercise the live-match pause path.",
    });
    return;
  }

  await expect(page.locator(".hud")).toBeVisible();
  await expect(page.locator("#pause-overlay")).toHaveCount(0);

  // Playwright has no cross-platform "background this tab" primitive, so
  // we simulate what main.ts actually listens for: a `visibilitychange`
  // event with `document.visibilityState === "hidden"` (see the
  // `onHidden` handler wired up in the /game route in src/main.ts).
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect(page.locator("#pause-overlay")).toBeVisible();
});
