/**
 * Playwright global teardown — runs once after all workers finish.
 * Writes the coverage reports from the data every test added (see coverage.ts).
 */
import { MCR } from "monocart-coverage-reports";
import { collectCoverage, coverageOptions } from "./coverage";

export default async function globalTeardown() {
  if (!collectCoverage) return;

  const results = await MCR(coverageOptions).generate();
  // An empty report means the source map or the filters stopped matching, which would otherwise
  // only show up as a drop in Codecov.
  if (!results?.files.length) {
    throw new Error(
      "No Playwright coverage was generated. Check the source map and filters in playwright/lib/coverage.ts."
    );
  }
}
