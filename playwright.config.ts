import { defineConfig, devices, type ReporterDescription } from "@playwright/test";
import path from "path";

const rootDir = __dirname;

// webpack.config.js advertises the dev server under the same default name. Using the checkout's
// folder name means each worktree's tests find that worktree's dev server, not another one's.
process.env.BONJOUR_SERVICE_NAME = process.env.BONJOUR_SERVICE_NAME || path.basename(rootDir);

const reportJson = !!process.env.CI;
const jsonReporter: ReporterDescription = ["json", { outputFile: path.join("test-results", "results.json") }];

export default defineConfig({
  testDir: "./playwright",
  globalSetup: "./playwright/lib/global-setup.ts",
  // Coverage is collected on CI; see playwright/lib/coverage.ts.
  globalTeardown: "./playwright/lib/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // GitHub's Linux runner has 4 vCPUs, shared by the dev server and each worker's browser.
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ...(reportJson ? [jsonReporter] : []),
  ],
  use: {
    baseURL: process.env.CI ? "http://localhost:8080" : undefined,
    trace: process.env.CI ? "on" : "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI ? {
    command: "npm start",
    url: "http://localhost:8080/",
    reuseExistingServer: true,
    timeout: 120_000,
  } : undefined,
});
