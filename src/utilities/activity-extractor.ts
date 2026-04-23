// Query params that the Activity Player recognizes for loading a resource.
// When a pasted URL contains these, we carry them over verbatim into the
// reloaded URL so that activity/sequence context (including page and
// sequenceActivity) is preserved.
const kForwardedParams = ["activity", "sequence", "sequenceActivity", "page"] as const;

// Matches authoring hostnames like `authoring.concord.org` and
// `authoring.staging.concord.org`.
const kAuthoringHostnameRegex = /^authoring\.(.*\.)?concord\.org$/;

// Matches authoring UI paths like `/activities/14237`, `/activities/14237/edit`,
// `/sequences/42`, etc. Captures the resource type and numeric id.
const kAuthoringUiPathRegex = /^\/(activities|sequences)\/(\d+)(?:\/.*)?$/;

// If `url` is an authoring UI URL (e.g. the edit page), return the params that
// load the corresponding API endpoint. Returns null for anything else.
const authoringUiParams = (url: URL): Record<string, string> | null => {
  if (!kAuthoringHostnameRegex.test(url.hostname)) return null;
  const match = kAuthoringUiPathRegex.exec(url.pathname);
  if (!match) return null;
  const [, resource, id] = match;
  const apiUrl = `${url.origin}/api/v1/${resource}/${id}.json`;
  return resource === "sequences" ? { sequence: apiUrl } : { activity: apiUrl };
};

/**
 * Parse a user-pasted value from the "load activity" dialog into a set of
 * Activity Player query parameters. Returns `null` when the input is empty
 * or only whitespace.
 *
 * Accepted inputs:
 * - An Activity Player URL that already carries `?activity=` or `?sequence=`
 *   (e.g. the "Run" URL copied from the authoring system). The relevant
 *   query params are extracted and forwarded.
 * - An authoring UI URL such as
 *   `https://authoring.concord.org/activities/14237/edit`. Converted to the
 *   corresponding `/api/v1/<resource>/<id>.json` endpoint; staging and
 *   production hosts are handled by preserving the URL's origin.
 * - A direct JSON endpoint URL from authoring
 *   (e.g. `https://authoring.concord.org/api/v1/activities/14237.json`) —
 *   used as the `activity` param verbatim.
 * - A sample activity key (non-URL string, e.g. `sample-activity-1`) — used
 *   as the `activity` param.
 */
export const extractActivityParams = (input: string): Record<string, string> | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    // Not a URL — treat as a sample activity key.
    return { activity: trimmed };
  }

  // If the pasted URL carries any of the Activity Player's own resource
  // params, forward those (and any associated navigation params) rather
  // than using the URL itself as the activity source.
  const forwarded: Record<string, string> = {};
  for (const key of kForwardedParams) {
    const value = parsed.searchParams.get(key);
    if (value) forwarded[key] = value;
  }
  if (forwarded.activity || forwarded.sequence) return forwarded;

  // Authoring UI URLs → convert to the corresponding JSON API endpoint.
  const fromAuthoring = authoringUiParams(parsed);
  if (fromAuthoring) return fromAuthoring;

  // URL with no AP-style params — assume the URL itself points at an
  // activity (e.g. a LARA `api/v1/<id>.json` endpoint).
  return { activity: trimmed };
};
