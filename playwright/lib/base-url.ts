/**
 * Custom Playwright test fixture that uses the dev server connection info
 * discovered by global-setup.ts. On CI, baseURL is set explicitly in
 * playwright.config.ts. Import `test` from this file instead of from
 * `@playwright/test` in all test files.
 */
import { test as pwTest } from "@playwright/test";
import { mixinFixtures as mixinCoverage } from "@bgotink/playwright-coverage";

const base = mixinCoverage(pwTest);

export const test = base.extend({
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
});
