/**
 * The iframe sizes the Activity Player gives an interactive, across a table of settings and window
 * sizes. Each case sets the sizing preview's hash on one shared page and compares the iframe's box
 * with the oracle in lib/ap-sizing.ts, which works the size out from the AP's CSS and code.
 *
 * Where the AP doesn't do what it should yet, the case expects the size it should have
 * (`apSizeAsSpecified`) and is marked as an expected failure. When the AP is fixed, Playwright
 * reports the case as passing unexpectedly: update `apSize` to match.
 */
import { test } from "./lib/base-url";
import { expect, Page } from "@playwright/test";
import {
  apSize, apSizeAsSpecified, ApSettings, ApSize, ApWindow, ASPECT_RATIO_METHODS, COLUMNS, FIXED_WIDTH_LAYOUTS,
  isResponsive, isTwoColumn, KINDS, SECTION_LAYOUTS
} from "./lib/ap-sizing";
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

  test.afterAll(async () => {
    await closeSharedPage(page);
  });

  for (const sizingCase of cases.values()) {
    test(sizingCase.name, async () => {
      await page.setViewportSize(sizingCase.viewport);
      await page.evaluate(hash => { window.location.hash = hash; }, sizingCase.hash);

      // A case the AP doesn't size as it should yet is an expected failure; knownBug says why.
      const apWin = await apWindow(page, sizingCase);
      test.fail(!sameSize(apSize(sizingCase.oracle, apWin), apSizeAsSpecified(sizingCase.oracle, apWin)),
        knownBug(sizingCase.oracle));

      // The window's width and the button's height are read again on each try: until the page has
      // applied the new settings, a scrollbar may come or go.
      const iframe = page.locator(".iframe-runtime iframe");
      await expect(async () => {
        const expected = apSizeAsSpecified(sizingCase.oracle, await apWindow(page, sizingCase));
        const box = await iframe.boundingBox();
        expect(box && { width: box.width, height: box.height }).toEqual({
          width: expect.closeTo(expected.iframeWidth, 0),
          height: expect.closeTo(expected.iframeHeight, 0),
        });
      }).toPass({ timeout: 3000 });
    });
  }
});
