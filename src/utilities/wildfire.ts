import { queryValue } from "./url-query";

export const kWildfireDefaultBranch = "master";

/**
 * Returns the active wildfire branch. This is the value of the `wildfire` query
 * parameter, or "master" when the parameter is not present.
 */
export const getWildfireBranch = (): string => {
  return queryValue("wildfire") || kWildfireDefaultBranch;
};

/**
 * Rewrites every https://wildfire.concord.org/ URL in the given resource so it
 * points at the specified branch deployment:
 *   https://wildfire.concord.org/branch/BRANCH/...
 * URLs that already target a branch (https://wildfire.concord.org/branch/foo/...)
 * have their existing branch segment replaced.
 */
export const rewriteWildfireUrls = <T>(resource: T, branch: string): T => {
  if (!resource) return resource;
  // Match the wildfire base, optionally followed by an existing `branch/<name>/`
  // segment, and replace that whole prefix with the requested branch.
  const regex = /https:\/\/wildfire\.concord\.org\/(branch\/[^/]+\/)?/g;
  const replacement = `https://wildfire.concord.org/branch/${branch}/`;
  return JSON.parse(JSON.stringify(resource).replace(regex, replacement));
};

/**
 * Returns a copy of the resource with all wildfire URLs rewritten to point at
 * the active wildfire branch (see `getWildfireBranch`).
 */
export const rewriteWildfireUrlsForActiveBranch = <T>(resource: T): T => {
  return rewriteWildfireUrls(resource, getWildfireBranch());
};
