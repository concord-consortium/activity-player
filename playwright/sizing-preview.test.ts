import { test } from "./lib/base-url";
import { expect, Locator } from "@playwright/test";
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

test("shows the iframe's size", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/sizing-preview.html");
  const iframe = page.locator(".iframe-runtime iframe");
  await expect(iframe).toBeVisible();

  const iframeReadout = page.getByTestId("readout-iframe");
  const windowReadout = page.getByTestId("readout-window");
  await expect(windowReadout).toHaveText("1280 × 800");
  await expect(iframeReadout).toHaveText(await formattedBox(iframe));

  await page.setViewportSize({ width: 1280, height: 600 });
  await expect(windowReadout).toHaveText("1280 × 600");
  await expect(async () => {
    await expect(iframeReadout).toHaveText(await formattedBox(iframe));
  }).toPass();
});

test("follows the iframe when it is replaced", async ({ page }) => {
  await page.goto("/sizing-preview.html");
  const iframe = page.locator(".iframe-runtime iframe");
  const iframeReadout = page.getByTestId("readout-iframe");
  await expect(iframeReadout).toBeVisible();

  // Swap in a clone with a different size, as a remount would swap in a new element.
  await iframe.evaluate(original => {
    original.setAttribute("data-original", "true");
    const clone = original.cloneNode() as HTMLIFrameElement;
    clone.removeAttribute("data-original");
    clone.style.width = "333px";
    clone.style.height = "222px";
    original.replaceWith(clone);
  });

  await expect(page.locator("iframe[data-original]")).toHaveCount(0);
  await expect(iframeReadout).toHaveText("333.0 × 222.0");
  await expect(iframeReadout).toHaveText(await formattedBox(iframe));
});

test("starts a new interactive only when the URL changes", async ({ page }) => {
  await page.goto("/sizing-preview.html");
  const interactive = page.locator(".managed-interactive");
  await expect(interactive).toHaveCount(1);
  await interactive.evaluate(element => element.setAttribute("data-marked", "true"));

  await page.evaluate(() => { window.location.hash = "#aspect_ratio_method=MAX"; });
  await expect(page.getByRole("combobox", { name: "Aspect Ratio" })).toHaveValue("MAX");
  await expect(page.locator(".managed-interactive[data-marked]")).toHaveCount(1);

  await page.evaluate(url => { window.location.hash = `#interactive=${encodeURIComponent(url)}`; },
    `${kDefaultInteractiveUrl}?another=1`);
  await expect(page.locator(".iframe-runtime iframe")).toHaveAttribute("src", /another=1/);
  await expect(page.locator(".managed-interactive[data-marked]")).toHaveCount(0);
  await expect(interactive).toHaveCount(1);
});

// The preview keeps a section mounted across settings changes, so its primary column can appear,
// or move to the other side, after the section measured it. Pinning needs the new column measured.
test.describe("pinning after the layout changes in place", () => {
  const pinned = /(^|\s)pinned(\s|$)/;

  test.beforeEach(async ({ page }) => {
    // Tall enough for the interactive's column to be shorter than the window, so it pins.
    await page.setViewportSize({ width: 1280, height: 800 });
  });

  test("pins a primary column that appears after the page opens", async ({ page }) => {
    // The default full-width section has no primary column.
    await page.goto("/sizing-preview.html");
    await expect(page.locator(".iframe-runtime iframe")).toBeAttached();

    await page.evaluate(() => { window.location.hash = "#layout=40-60"; });

    const wrapper = page.locator(".column.primary .embeddableWrapper");
    await expect(wrapper).toHaveClass(pinned);
    // #app is the page's scroll container. A pinned column sticks 10 px from the top.
    await page.locator("#app").evaluate(app => { app.scrollTop = 400; });
    await expect(async () => {
      expect((await wrapper.boundingBox())?.y).toBeCloseTo(10, 0);
    }).toPass();
  });

  test("measures a primary column that moves to the other side", async ({ page }) => {
    await page.goto("/sizing-preview.html#layout=60-40");
    const wrapper = page.locator(".column.primary .embeddableWrapper");
    await expect(wrapper).toHaveClass(pinned);

    // 40-60 puts the primary column on the right, as a new element, and the column setting puts
    // the tall text in it. Taller than the window, it doesn't pin.
    await page.evaluate(() => { window.location.hash = "#layout=40-60&column=secondary"; });

    await expect(page.locator(".column.secondary .iframe-runtime iframe")).toBeAttached();
    await expect(wrapper).not.toHaveClass(pinned);
  });
});

async function formattedBox(iframe: Locator) {
  const box = await iframe.boundingBox();
  if (!box) throw new Error("the iframe has no box");
  return `${box.width.toFixed(1)} × ${box.height.toFixed(1)}`;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
