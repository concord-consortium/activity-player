import { test } from "./lib/base-url";
import { expect } from "@playwright/test";

test("loads a sample activity and shows its name", async ({ page }) => {
  // Sample activities in src/data load by name, with no network access to LARA.
  await page.goto("/?activity=sample-activity-1&preview");
  // Prefer getByRole over CSS selectors or data-testid for Playwright tests.
  // See https://playwright.dev/docs/locators#quick-guide
  await expect(page.getByRole("heading", { level: 1, name: "Single Page Test Activity" })).toBeVisible();
});
