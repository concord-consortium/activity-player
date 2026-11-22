/**
 * Browser code coverage for the Playwright tests, reported with monocart-coverage-reports (MCR).
 *
 * Chromium measures the coverage natively (V8), so the app runs without instrumentation. MCR maps it
 * back to the source files and counts statements by parsing the code, so its line counts match the
 * istanbul reports from Jest and Cypress and the three Codecov flags merge on equal terms.
 *
 * The fixture in base-url.ts adds each test's coverage, and global-teardown.ts writes the reports.
 */
import path from "path";
import type { APIRequestContext } from "@playwright/test";
import type { CoverageReportOptions, V8CoverageEntry } from "monocart-coverage-reports";

export const collectCoverage = !!process.env.CI;

const repositoryName = process.env.REPOSITORY_NAME || "activity-player";

// The webpack bundle. This leaves out the page's inline scripts.
const isBundle = (entry: V8CoverageEntry) => /\/assets\/[^/]+\.js$/.test(entry.url);

// The CI workflow uploads coverage.lcov from here.
export const coverageDir = path.join(__dirname, "..", "..", "test-results", "coverage");

export const coverageOptions: CoverageReportOptions = {
  name: "Playwright Coverage",
  outputDir: coverageDir,
  reports: [
    ["v8"],
    ["lcovonly", { file: "coverage.lcov" }],
    ["console-summary"],
  ],
  // Every worker adds to the same cache, so only global setup may clear it.
  cleanCache: false,
  entryFilter: isBundle,
  // Webpack names the sources "<repository>/src/...", "<repository>/node_modules/..." and so on.
  sourcePath: (filePath) => filePath.replace(`${repositoryName}/`, ""),
  // Only the app's own scripts. This sees the paths sourcePath returns. Stylesheets and SVGs are
  // mapped too, through the loader modules that insert them, but they aren't JavaScript source and
  // Jest doesn't measure them either.
  sourceFilter: (sourcePath) => sourcePath.startsWith("src/") && /\.(js|jsx|ts|tsx)$/.test(sourcePath),
};

const sourceMaps = new Map<string, Promise<unknown>>();

/**
 * The bundle's text also holds its dependencies' inline source map comments, and MCR would take one
 * of those as the bundle's map. Attaching the bundle's own map file avoids that. Each worker fetches
 * a map once.
 */
export async function attachSourceMaps(request: APIRequestContext, entries: V8CoverageEntry[]) {
  for (const entry of entries.filter(isBundle)) {
    let sourceMap = sourceMaps.get(entry.url);
    if (!sourceMap) {
      sourceMap = request.get(`${entry.url}.map`).then(response => {
        if (!response.ok()) {
          throw new Error(`Couldn't load the source map for ${entry.url}: ${response.status()}`);
        }
        return response.json();
      });
      sourceMaps.set(entry.url, sourceMap);
    }
    entry.sourceMap = await sourceMap;
  }
}
