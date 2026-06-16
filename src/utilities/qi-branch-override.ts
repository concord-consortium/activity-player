import { queryValue } from "./url-query";

// Match the `branch/<name>/` or `version/<name>/` segment after the
// question-interactives repo root, so we can swap it for the qiBranch param's
// value. Limited to the known models-resources host so URLs from other origins
// are never rewritten.
const QI_URL_RE = /(https:\/\/models-resources\.concord\.org\/question-interactives\/)(?:branch|version)\/[^/]+\//;

/**
 * When the `?qiBranch=<name>` URL parameter is present, rewrite any
 * question-interactives URL to use that branch's deployment. Lets a deployed
 * question-interactives branch be tested against a published sample activity
 * without editing the activity JSON. URLs that don't match the
 * question-interactives pattern pass through unchanged.
 */
export const applyQiBranchOverride = (url: string): string => {
  const branch = queryValue("qiBranch");
  if (!branch) return url;
  return url.replace(QI_URL_RE, `$1branch/${branch}/`);
};
