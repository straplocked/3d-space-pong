import { test, expect } from "@playwright/test";
import { gotoMenu } from "./support/helpers.js";

test("Hall of Fame / Hall of Shame tabs switch", async ({ page }) => {
  await gotoMenu(page);
  await page.locator('[data-action="leaderboard"]').click();
  await expect(page.locator(".leaderboard-tabs")).toBeVisible();

  // Defaults to Shame (preserves the historical deep-link shape — see
  // the doc comment at the top of src/ui/leaderboard.ts).
  const fameTab = page.locator('[data-tab="fame"]');
  const shameTab = page.locator('[data-tab="shame"]');
  await expect(shameTab).toHaveClass(/active/);
  await expect(fameTab).not.toHaveClass(/active/);
  await expect(page.locator("#lb-body")).not.toContainText("Loading");

  await fameTab.click();
  await expect(fameTab).toHaveClass(/active/);
  await expect(shameTab).not.toHaveClass(/active/);
  await expect(fameTab).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#lb-body")).not.toContainText("Loading");

  await shameTab.click();
  await expect(shameTab).toHaveClass(/active/);
  await expect(fameTab).not.toHaveClass(/active/);
});

test("?tab=fame deep link opens on the Fame tab", async ({ page }) => {
  await gotoMenu(page);
  await page.goto("/#/leaderboard?tab=fame");
  await expect(page.locator('[data-tab="fame"]')).toHaveClass(/active/);
  await expect(page.locator("#lb-body")).not.toContainText("Loading");
});
