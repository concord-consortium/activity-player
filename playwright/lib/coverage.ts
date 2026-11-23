/**
 * Browser code coverage for the Playwright tests, reported with monocart-coverage-reports (MCR).
 *
 * Chromium measures the coverage natively (V8), so the app runs without instrumentation. MCR maps it
 * back to the source files and counts statements by parsing the code, so its lines closely match the
 * istanbul reports from Jest and Cypress. It also counts a line where an untested branch starts on
 * its own line, such as the `? ...` arm of a conditional, which istanbul counts only as a branch.
 *
 * The fixture in base-url.ts adds each test's coverage, and global-teardown.ts writes the reports.
 */
import fs from "fs";
import path from "path";
import type { APIRequestContext, Page } from "@playwright/test";
import { MCR, type CoverageReportOptions, type V8CoverageEntry } from "monocart-coverage-reports";

export const collectCoverage = !!process.env.CI;

// The app's webpack bundles. This leaves out the page's inline scripts, and the scripts of
// interactives on other origins: Chromium measures the page's iframes too, and an interactive's
// bundle can also sit in an assets folder.
const isAppBundle = (entry: V8CoverageEntry, appOrigin: string) =>
  entry.url.startsWith(`${appOrigin}/`) && /\/assets\/[^/]+\.js$/.test(entry.url);

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
  sourcePath: (filePath) => filePath.startsWith(sourcePrefix) ? filePath.slice(sourcePrefix.length) : filePath,
  // Only the app's own scripts. This sees the paths sourcePath returns. Stylesheets (through the
  // loader modules that insert them) and SVGs (as SVGR components) are mapped too, but neither is
  // JavaScript source, and Jest doesn't measure them either. A path that isn't a file here comes
  // from a wrong source map, such as a dependency's inline one, so it is left out and global
  // teardown reports no coverage.
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
async function attachSourceMaps(request: APIRequestContext, entries: V8CoverageEntry[]) {
  for (const entry of entries) {
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

/**
 * Stops the page's coverage, which must have been started, and adds the app's bundles to the
 * report. `baseURL` is the app's, which says which bundles are the app's.
 */
export async function addPageCoverage(page: Page, baseURL: string) {
  const appOrigin = new URL(baseURL).origin;
  const entries: V8CoverageEntry[] = (await page.coverage.stopJSCoverage())
    .filter(entry => isAppBundle(entry, appOrigin));
  // A test on a shared page leaves its own page blank, and MCR logs an error for an empty list.
  if (entries.length === 0) return;
  await attachSourceMaps(page.request, entries);
  await MCR(coverageOptions).add(entries);
}
