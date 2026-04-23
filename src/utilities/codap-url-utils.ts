import { queryValue } from "./url-query";

// Known CODAP hostnames (V2 and V3) that should be redirected to the base URL
// provided via the `codap` query parameter. Including the V3 hostname ensures
// that stale V3 URLs in existing activities are also redirected to whatever
// V3 build the tester wants to exercise.
const kCodapHostnames = new Set([
  "codap.concord.org",
  "codap3.concord.org"
]);

// Query parameter used by models-resources wrappers (e.g. the full-screen
// question interactive) to embed an inner interactive URL.
const kWrappedInteractiveParam = "wrappedInteractive";

// Read once at module load so the converter is a no-op unless the user opted in.
const codapBaseUrlOverride = queryValue("codap");

const isCodapUrl = (url: URL) => kCodapHostnames.has(url.hostname);

// Only http(s) bases are accepted. Rejecting other schemes (javascript:, data:,
// file:, etc.) prevents an attacker-crafted link like `?codap=javascript:...`
// from turning a CODAP iframe into an execution vector.
const isSafeBase = (base: string): boolean => {
  try {
    const { protocol } = new URL(base);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

// Replace the origin+path of a CODAP URL with a user-supplied base URL,
// preserving the original query string verbatim (so flag-style params like
// `interactiveApi` keep their exact form) and the original hash. Any query
// params on the supplied base are kept and the original's are appended with
// `&`. A hash on the supplied base is only kept if the original URL has no
// hash of its own.
const swapBase = (original: URL, base: string): string => {
  const baseHashIdx = base.indexOf("#");
  const baseBody = baseHashIdx >= 0 ? base.substring(0, baseHashIdx) : base;
  const baseHash = baseHashIdx >= 0 ? base.substring(baseHashIdx) : "";
  const baseHasQuery = baseBody.includes("?");

  let out = baseBody;
  if (original.search) {
    out += baseHasQuery ? "&" + original.search.substring(1) : original.search;
  }
  out += original.hash || baseHash;
  return out;
};

/**
 * If `url` is a CODAP URL (V2 or V3), return an equivalent URL rewritten to
 * use `base`. If `url` is a wrapper (e.g. the full-screen question interactive)
 * whose `wrappedInteractive` query parameter is a CODAP URL, rewrite only the
 * wrapped URL while keeping the wrapper intact. Returns `url` unchanged if no
 * CODAP URL is detected or if `url` can't be parsed.
 */
export const convertCodapUrl = (url: string, base: string): string => {
  if (!isSafeBase(base)) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (isCodapUrl(parsed)) {
    return swapBase(parsed, base);
  }

  const wrapped = parsed.searchParams.get(kWrappedInteractiveParam);
  if (wrapped) {
    const convertedWrapped = convertCodapUrl(wrapped, base);
    if (convertedWrapped !== wrapped) {
      parsed.searchParams.set(kWrappedInteractiveParam, convertedWrapped);
      return parsed.toString();
    }
  }

  return url;
};

/**
 * No-op unless the `codap` URL query parameter is set, in which case any
 * CODAP URL (V2 or V3, direct or nested inside a `wrappedInteractive`
 * wrapper) is rewritten to use the supplied base URL.
 */
export const maybeConvertCodapUrl = (url: string): string => {
  if (!codapBaseUrlOverride) return url;
  return convertCodapUrl(url, codapBaseUrlOverride);
};
