// Portal hostnames whose learner data lives in the production report-service
// firebase app (`report-service-pro`). A student run launched from one of these
// only loads its saved data when `firebase_app=report-service-pro`, but that is
// NOT the default off-production: localhost and branch deploys default to
// `report-service-dev` (see firebaseAppName in portal-api). So when a production
// launch URL is pasted, we default `firebaseApp` to `report-service-pro` (unless
// the URL already specifies one) so the run loads as the student everywhere.
const kProductionPortalHostnames = new Set(["learn.concord.org"]);

const isProductionPortalDomain = (domain: string): boolean => {
  try {
    return kProductionPortalHostnames.has(new URL(domain).hostname);
  } catch {
    return false;
  }
};

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
 *   (e.g. the "Run" URL copied from the authoring system, or a student's full
 *   launch URL from learn.concord.org with `domain`, `domain_uid`, `token`,
 *   etc.). All of its query params are forwarded verbatim — only
 *   `noDefaultActivity` is dropped — so auth and navigation context is
 *   preserved and the run loads exactly as it was launched. When the `domain`
 *   is a production portal (learn.concord.org) and no `firebaseApp` is present,
 *   `firebaseApp=report-service-pro` is added so the student's data loads even
 *   off-production (localhost / branch deploys, which otherwise default to
 *   report-service-dev).
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

  // If the pasted URL carries one of the Activity Player's own resource params,
  // treat it as a full AP launch URL and forward all of its query params (auth
  // and navigation context included, e.g. a student's `domain`/`token`) rather
  // than using the URL itself as the activity source. `noDefaultActivity` is
  // dropped so the picker dialog isn't shown again after the reload.
  if (parsed.searchParams.get("activity") || parsed.searchParams.get("sequence")) {
    const forwarded: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      if (key !== "noDefaultActivity") forwarded[key] = value;
    });
    // A production student run stores data in `report-service-pro`; default to
    // it so the run loads correctly off-production (localhost / branch deploys),
    // unless the pasted URL already pins a specific firebase app.
    if (!forwarded.firebaseApp && forwarded.domain && isProductionPortalDomain(forwarded.domain)) {
      forwarded.firebaseApp = "report-service-pro";
    }
    return forwarded;
  }

  // Authoring UI URLs → convert to the corresponding JSON API endpoint.
  const fromAuthoring = authoringUiParams(parsed);
  if (fromAuthoring) return fromAuthoring;

  // URL with no AP-style params — assume the URL itself points at an
  // activity (e.g. a LARA `api/v1/<id>.json` endpoint).
  return { activity: trimmed };
};
