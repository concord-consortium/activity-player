import { test } from "./lib/base-url";
import { expect } from "@playwright/test";
import { kDefaultInteractiveUrl } from "../src/sizing-preview/settings";

test("opens with the default settings", async ({ page }) => {
  await page.goto("/sizing-preview.html");

  const iframe = page.locator(".iframe-runtime iframe");
  await expect(iframe).toHaveAttribute("src", new RegExp(`^${escapeRegExp(kDefaultInteractiveUrl)}`));
  // The preview leaves out the page title and the page navigation.
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Page navigation" })).toHaveCount(0);
  await expect(page.locator(".activity")).toHaveClass(/(^|\s)fixed-width-1100px(\s|$)/);
});

test("applies a changed hash without reloading", async ({ page }) => {
  await page.goto("/sizing-preview.html");
  await expect(page.locator(".iframe-runtime iframe")).toBeAttached();

  await page.evaluate(() => { (window as any).__marker = 1; });
  await page.evaluate(() => { window.location.hash = "#layout=responsive-50-50&column=secondary"; });

  await expect(page.locator(".activity")).toHaveClass(/(^|\s)responsive(\s|$)/);
  await expect(page.locator(".column.secondary .iframe-runtime iframe")).toBeAttached();
  expect(await page.evaluate(() => (window as any).__marker)).toBe(1);
});

test("changing a control doesn't add history entries", async ({ page }) => {
  await page.goto("about:blank");
  await page.goto("/sizing-preview.html");
  const layout = page.getByRole("combobox", { name: "Layout" });
  await expect(layout).toBeVisible();
  const before = await page.evaluate(() => window.history.length);

  await layout.selectOption("60-40");
  await layout.selectOption("responsive-50-50");

  expect(await page.evaluate(() => window.history.length)).toBe(before);
  expect(await page.evaluate(() => window.location.hash)).toContain("layout=responsive-50-50");
});

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
