/**
 * The sizing preview copies the wrappers App draws around a page. These tests open a bundled sample
 * activity in App and the same settings in the preview, at the same window size, and check the
 * interactive's iframe gets the same box in both.
 */
import { test } from "./lib/base-url";
import { expect, Page } from "@playwright/test";
import { IframeBox, settledIframeBox } from "./lib/iframe-box";

interface ParityCase {
  name: string;
  viewport: { width: number; height: number };
  /** The sample's page, as App's `page` parameter. */
  appPage: string;
  /** The same settings, as the preview's hash. */
  previewHash: string;
}

const kInteractiveSettings = "kind=library&aspect_ratio_method=DEFAULT&name=1&show_delete_data_button=0";
const kFixedPage = `fixed_width_layout=1100px&layout=full-width&${kInteractiveSettings}`;
const kResponsivePage =
  `fixed_width_layout=1100px&layout=responsive-50-50&column=primary&other_text=tall&${kInteractiveSettings}`;

const cases: ParityCase[] = [
  {
    name: "a full-width section on a fixed 1100px page",
    viewport: { width: 1280, height: 800 },
    appPage: "page_1",
    previewHash: kFixedPage,
  },
  {
    name: "a full-width section on a fixed 1100px page, in a window narrower than the page",
    viewport: { width: 1000, height: 800 },
    appPage: "page_1",
    previewHash: kFixedPage,
  },
  {
    name: "the primary column of a responsive-50-50 section",
    viewport: { width: 1280, height: 800 },
    appPage: "page_2",
    previewHash: kResponsivePage,
  },
];

/**
 * The iframe's box once the interactive has loaded and two reads 200 ms apart agree. The interactive
 * loads over the network and can change its size when it starts, and App can take longer to load
 * than the preview.
 */
async function stableIframeBox(page: Page): Promise<IframeBox> {
  await expect(page.frameLocator(".iframe-runtime iframe").locator("#app > *").first())
    .toBeAttached({ timeout: 30_000 });
  let box: IframeBox | null = null;
  await expect(async () => {
    const first = await settledIframeBox(page);
    await page.waitForTimeout(200);
    const second = await settledIframeBox(page);
    expect(first).not.toBeNull();
    expect(second).toEqual(first);
    box = second;
  }).toPass({ timeout: 10_000 });
  if (!box) throw new Error("the iframe has no box");
  return box;
}

for (const parityCase of cases) {
  test(`the preview sizes the iframe as App does: ${parityCase.name}`, async ({ page }) => {
    // Two pages load, each with an interactive from the network.
    test.slow();
    await page.setViewportSize(parityCase.viewport);

    // `preview` keeps App's Firestore offline.
    await page.goto(`/?activity=sample-sizing-parity&preview&page=${parityCase.appPage}`);
    const appBox = await stableIframeBox(page);

    await page.goto(`/sizing-preview.html#${parityCase.previewHash}`);
    const previewBox = await stableIframeBox(page);

    expect(previewBox).toEqual({
      x: expect.closeTo(appBox.x, 0),
      width: expect.closeTo(appBox.width, 0),
      height: expect.closeTo(appBox.height, 0),
    });
  });
}
