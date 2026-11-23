/**
 * A page that a group of tests shares, opened in `beforeAll` and closed in `afterAll`, for tests that
 * change one loaded page rather than load a page each. The `page` fixture is per test, so it can't be
 * shared. Like the fixture in base-url.ts, it uses the resolved base URL and adds its coverage when
 * coverage is on.
 */
import type { Browser, Page, TestInfo } from "@playwright/test";
import { resolveBaseURL } from "./base-url";
import { addPageCoverage, collectCoverage } from "./coverage";

export async function openSharedPage(browser: Browser, testInfo: TestInfo): Promise<Page> {
  const page = await browser.newPage({ baseURL: resolveBaseURL(testInfo.project.use.baseURL) });
  if (collectCoverage) {
    // Keep the coverage across navigations, as the fixture does.
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
  }
  return page;
}

export async function closeSharedPage(page: Page, testInfo: TestInfo): Promise<void> {
  try {
    if (collectCoverage) {
      await addPageCoverage(page, resolveBaseURL(testInfo.project.use.baseURL));
    }
  } finally {
    // browser.newPage gives the page a context of its own.
    await page.context().close();
  }
}
