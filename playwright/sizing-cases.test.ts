/**
 * The iframe sizes the Activity Player gives an interactive, across a table of settings and window
 * sizes. Each case sets the sizing preview's hash on one shared page and compares the iframe's box
 * with the oracle in lib/ap-sizing.ts, which works the size out from the AP's CSS and code.
 *
 * Where the AP doesn't do what it should yet, the case first checks the size the AP gives today
 * (`apSize`), so any other change to that size fails the case. Only then is it marked as an expected
 * failure, and it expects the size it should have (`apSizeAsSpecified`). When the AP is fixed, the
 * first check fails, unexpectedly, which flags the case: update `apSize` to match.
 */
import { test } from "./lib/base-url";
import { expect, Page } from "@playwright/test";
import {
  apSize, apSizeAsSpecified, ApSettings, ApSize, ApWindow, ASPECT_RATIO_METHODS, COLUMNS, FIXED_WIDTH_LAYOUTS,
  isResponsive, isTwoColumn, KINDS, SECTION_LAYOUTS
} from "./lib/ap-sizing";
import { settledIframeBox } from "./lib/iframe-box";
import { closeSharedPage, openSharedPage } from "./lib/shared-page";

interface Viewport { width: number; height: number }

interface SizingCase {
  name: string;
  hash: string;
  viewport: Viewport;
  oracle: ApSettings;
}

const kBaseSettings: ApSettings = {
  fixedWidthLayout: "1100px",
  layout: "full-width",
  column: "primary",
  kind: "library",
  aspectRatioMethod: "DEFAULT",
  // 16:9, so MANUAL's height differs from DEFAULT's 4:3.
  nativeWidth: 800,
  nativeHeight: 450,
  named: true,
  clearButton: false,
};
const kWindow: Viewport = { width: 1280, height: 800 };

function caseName(s: ApSettings, viewport: Viewport) {
  const parts = [
    isTwoColumn(s.layout) ? `${s.layout} ${s.column}` : s.layout,
    `${s.fixedWidthLayout} page`,
    s.kind,
    s.aspectRatioMethod === "MANUAL" ? `MANUAL ${s.nativeWidth}×${s.nativeHeight}` : s.aspectRatioMethod,
  ];
  if (!s.named) parts.push("unnamed");
  if (s.clearButton) parts.push("with Clear & start over");
  parts.push(`${viewport.width}×${viewport.height}`);
  return parts.join(", ");
}

function hashFor(s: ApSettings) {
  const params = new URLSearchParams({
    fixed_width_layout: s.fixedWidthLayout,
    layout: s.layout,
    column: s.column,
    kind: s.kind,
    aspect_ratio_method: s.aspectRatioMethod,
    native_width: String(s.nativeWidth),
    native_height: String(s.nativeHeight),
    name: s.named ? "1" : "0",
    show_delete_data_button: s.clearButton ? "1" : "0",
  });
  return `#${params.toString()}`;
}

const cases = new Map<string, SizingCase>();
function addCase(settings: Partial<ApSettings>, viewport: Viewport = kWindow) {
  const oracle = { ...kBaseSettings, ...settings };
  const name = caseName(oracle, viewport);
  cases.set(name, { name, hash: hashFor(oracle), viewport, oracle });
}

// Every layout in each column on both fixed pages.
for (const fixedWidthLayout of FIXED_WIDTH_LAYOUTS) {
  for (const layout of SECTION_LAYOUTS) {
    for (const column of isTwoColumn(layout) ? COLUMNS : ["primary" as const]) {
      addCase({ fixedWidthLayout, layout, column });
    }
  }
}

// Every aspect ratio in each kind, in a full-width section and in a primary column.
for (const kind of KINDS) {
  for (const aspectRatioMethod of ASPECT_RATIO_METHODS) {
    for (const layout of ["full-width", "60-40"] as const) {
      addCase({ kind, aspectRatioMethod, layout });
    }
  }
}

// "Use all available space" where the AP decides whether to stretch it: the primary column of the
// responsive layouts, a secondary column and a responsive-full-width section.
for (const kind of KINDS) {
  addCase({ kind, aspectRatioMethod: "MAX", layout: "responsive-30-70" });
  addCase({ kind, aspectRatioMethod: "MAX", layout: "responsive-50-50" });
  addCase({ kind, aspectRatioMethod: "MAX", layout: "60-40", column: "secondary" });
  addCase({ kind, aspectRatioMethod: "MAX", layout: "responsive-full-width" });
}

// Named and unnamed, where the title bar and the border change the stretched height.
for (const kind of KINDS) {
  for (const named of [true, false]) {
    addCase({ kind, named, aspectRatioMethod: "MAX" });
  }
}

// "Clear & start over" with each aspect ratio. A full-width DEFAULT interactive hits the height cap.
for (const aspectRatioMethod of ASPECT_RATIO_METHODS) {
  addCase({ aspectRatioMethod, clearButton: true });
}
// Under the height cap, so the button doesn't change the size.
addCase({ layout: "60-40", column: "secondary", clearButton: true });
// Unnamed, the interactive keeps a "Question #1" title bar.
addCase({ aspectRatioMethod: "MAX", clearButton: true, named: false });

// A window narrower than the 1100 px page.
addCase({}, { width: 1000, height: 800 });
addCase({ layout: "60-40" }, { width: 1000, height: 800 });

// The DEFAULT height cap, which also narrows the iframe.
addCase({}, { width: 1280, height: 500 });

// Each responsive layout at two window widths.
for (const width of [1280, 900]) {
  for (const layout of SECTION_LAYOUTS.filter(isResponsive)) {
    for (const column of isTwoColumn(layout) ? COLUMNS : ["primary" as const]) {
      addCase({ layout, column }, { width, height: 800 });
    }
  }
}

function sameSize(a: ApSize, b: ApSize) {
  return a.iframeWidth === b.iframeWidth && a.iframeHeight === b.iframeHeight;
}

/** The oracle's window: `#app`'s width, which leaves out a classic scrollbar, and the button's height. */
async function apWindow(page: Page, sizingCase: SizingCase): Promise<ApWindow> {
  const width = await page.evaluate(() => document.getElementById("app")?.clientWidth ?? 0);
  let clearButtonHeight = 0;
  if (sizingCase.oracle.clearButton) {
    const button = page.getByRole("button", { name: "Clear & start over", exact: true });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    if (!box) throw new Error("the button has no box");
    // Its 5 px bottom margin (`.iframe-runtime button.button` in iframe-runtime.scss).
    clearButtonHeight = box.height + 5;
  }
  return { width, height: sizingCase.viewport.height, clearButtonHeight };
}

/**
 * Waits until the page shows the case's settings and window size, so the iframe isn't measured
 * under the previous case's. Every case differs from the one before in a setting the controls show
 * or in the window size the readout shows.
 */
async function expectSettingsApplied(page: Page, { oracle, viewport }: SizingCase) {
  const combobox = (name: string) => page.getByRole("combobox", { name, exact: true });
  const checkbox = (name: string) => page.getByRole("checkbox", { name, exact: true });
  await expect(combobox("Activity Page Fixed Width")).toHaveValue(oracle.fixedWidthLayout);
  await expect(combobox("Layout")).toHaveValue(oracle.layout);
  if (isTwoColumn(oracle.layout)) {
    await expect(combobox("Interactive's column")).toHaveValue(oracle.column);
  }
  await expect(combobox("Interactive kind")).toHaveValue(oracle.kind);
  await expect(combobox("Aspect Ratio")).toHaveValue(oracle.aspectRatioMethod);
  if (oracle.aspectRatioMethod === "MANUAL") {
    await expect(page.getByRole("textbox", { name: "Width", exact: true })).toHaveValue(String(oracle.nativeWidth));
    await expect(page.getByRole("textbox", { name: "Height", exact: true })).toHaveValue(String(oracle.nativeHeight));
  }
  await expect(checkbox("Has a name")).toBeChecked({ checked: oracle.named });
  await expect(checkbox('Show "Clear & start over" button')).toBeChecked({ checked: oracle.clearButton });
  await expect(page.getByTestId("readout-window")).toHaveText(`${viewport.width} × ${viewport.height}`);
}

/**
 * Expects the iframe's size the oracle gives. The window's width and the button's height are read
 * again on each try: until the page has laid out the new settings, a scrollbar may come or go.
 */
async function expectIframeSize(page: Page, sizingCase: SizingCase, size: typeof apSize) {
  await expect(async () => {
    const expected = size(sizingCase.oracle, await apWindow(page, sizingCase));
    expect(await settledIframeBox(page)).toMatchObject({
      width: expect.closeTo(expected.iframeWidth, 0),
      height: expect.closeTo(expected.iframeHeight, 0),
    });
  }).toPass({ timeout: 3000 });
}

/** Why the AP doesn't give a case the size it should have yet, in plain words. */
function knownBug(settings: ApSettings) {
  if (settings.aspectRatioMethod !== "MAX") {
    return "The AP no longer leaves room for the \"Clear & start over\" button under the default aspect ratio's " +
      "height cap.";
  }
  const where = !isTwoColumn(settings.layout) ? "in a responsive-full-width section"
    : settings.column === "secondary" ? "in a secondary column"
    : "in a primary column when the embed inherits the setting from its library interactive";
  return `The AP doesn't stretch "Use all available space" ${where}, so the iframe stays at its 300 px default.`;
}

test.describe("iframe sizes", () => {
  // One worker runs the cases in order on the shared page, though the config runs tests in parallel.
  // An unexpected failure starts a new worker, which opens the page again, rather than skipping the
  // rest.
  test.describe.configure({ mode: "default" });

  let page: Page;

  test.beforeAll(async ({ browser }, testInfo) => {
    page = await openSharedPage(browser, testInfo);
    await page.goto("/sizing-preview.html");
    await expect(page.locator(".iframe-runtime iframe")).toBeVisible();
  });

  // Playwright needs the fixtures argument destructured, even when no fixture is used.
  // eslint-disable-next-line no-empty-pattern
  test.afterAll(async ({}, testInfo) => {
    // page is undefined when beforeAll failed, and closing it would hide that error.
    if (page) await closeSharedPage(page, testInfo);
  });

  for (const sizingCase of cases.values()) {
    test(sizingCase.name, async () => {
      await page.setViewportSize(sizingCase.viewport);
      await page.evaluate(hash => { window.location.hash = hash; }, sizingCase.hash);
      await expectSettingsApplied(page, sizingCase);

      const apWin = await apWindow(page, sizingCase);
      if (!sameSize(apSize(sizingCase.oracle, apWin), apSizeAsSpecified(sizingCase.oracle, apWin))) {
        // A known bug: the AP's size today must still be what the oracle says, so any other change
        // fails the case. Once the AP is fixed, this check fails, unexpectedly, and flags the case.
        await expectIframeSize(page, sizingCase, apSize);
        test.fail(true, knownBug(sizingCase.oracle));
      }
      await expectIframeSize(page, sizingCase, apSizeAsSpecified);
    });
  }
});
