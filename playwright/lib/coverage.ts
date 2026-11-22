/**
 * Browser code coverage for the Playwright tests, reported with monocart-coverage-reports (MCR).
 *
 * Chromium measures the coverage natively (V8), so the app runs without instrumentation. MCR maps it
 * back to the source files and counts statements by parsing the code, so its line counts match the
 * istanbul reports from Jest and Cypress and the three Codecov flags merge on equal terms.
 *
 * The fixture in base-url.ts adds each test's coverage, and global-teardown.ts writes the reports.
 */
import fs from "fs";
import path from "path";
import type { APIRequestContext } from "@playwright/test";
import type { CoverageReportOptions, V8CoverageEntry } from "monocart-coverage-reports";

export const collectCoverage = !!process.env.CI;

// The webpack bundle. This leaves out the page's inline scripts.
const isBundle = (entry: V8CoverageEntry) => /\/assets\/[^/]+\.js$/.test(entry.url);

const rootDir = path.join(__dirname, "..", "..");

// Webpack prefixes source paths with its namespace, which defaults to package.json's name:
// "activity-player/src/...", "activity-player/node_modules/..." and so on.
const sourcePrefix = `${JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8")).name}/`;

export const coverageOptions: CoverageReportOptions = {
  name: "Playwright Coverage",
  // The CI workflow uploads coverage.lcov from here. Playwright clears test-results at the start of
  // each run, which also clears the last run's coverage.
  outputDir: path.join(rootDir, "test-results", "coverage"),
  reports: [
    ["v8"],
    ["lcovonly", { file: "coverage.lcov" }],
    ["console-summary"],
  ],
  // Every worker adds to the same cache, so none of them may clear it.
  cleanCache: false,
  entryFilter: isBundle,
  sourcePath: (filePath) => filePath.startsWith(sourcePrefix) ? filePath.slice(sourcePrefix.length) : filePath,
  // Only the app's own scripts. This sees the paths sourcePath returns. Stylesheets and SVGs are
  // mapped too, through the loader modules that insert them, but they aren't JavaScript source and
  // Jest doesn't measure them either. A path that isn't a file here comes from a wrong source map,
  // such as a dependency's inline one, so it is left out and global teardown reports no coverage.
  sourceFilter: (sourcePath) =>
    sourcePath.startsWith("src/") && /\.(js|jsx|ts|tsx)$/.test(sourcePath) &&
    fs.existsSync(path.join(rootDir, sourcePath)),
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
