/**
 * Custom Playwright test fixture that uses the dev server connection info
 * discovered by global-setup.ts. On CI, baseURL is set explicitly in
 * playwright.config.ts. Import `test` from this file instead of from
 * `@playwright/test` in all test files.
 *
 * It also collects each test's browser coverage when coverage is on (see coverage.ts).
 */
import { test as pwTest } from "@playwright/test";
import { MCR } from "monocart-coverage-reports";
import { attachSourceMaps, collectCoverage, coverageOptions } from "./coverage";

export const test = pwTest.extend<{ coverage: void }>({
  baseURL: async ({ baseURL }, use) => {
    if (!baseURL) {
      if (process.env.CI) {
        throw new Error("baseURL must be set in CI environment");
      }
      const protocol = process.env.DEV_SERVER_PROTOCOL || "http";
      const port = process.env.DEV_SERVER_PORT;
      if (!port) {
        throw new Error("DEV_SERVER_PORT not set. Is global-setup.ts configured in playwright.config.ts?");
      }
      baseURL = `${protocol}://localhost:${port}`;
    }
    await use(baseURL);
  },
  coverage: [async ({ page }, use) => {
    if (!collectCoverage) {
      await use();
      return;
    }
    // Keep the coverage across navigations within the test.
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    try {
      await use();
    } finally {
      const entries = await page.coverage.stopJSCoverage();
      await attachSourceMaps(page.request, entries);
      await MCR(coverageOptions).add(entries);
    }
  }, { auto: true }],
});
