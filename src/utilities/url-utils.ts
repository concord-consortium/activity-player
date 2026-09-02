// A url that begins with "//" inherits the scheme of the page that loads it, so resolve it
// against the current location the way the browser does. Everything else is parsed without
// a base, so relative paths are rejected.
const parseUrl = (url?: string): URL | undefined => {
  if (!url) return undefined;
  try {
    // The URL parser ignores leading whitespace, so the scheme-relative test must too.
    return new URL(url, /^\s*\/\//.test(url) ? window.location.href : undefined);
  } catch {
    return undefined;
  }
};

const isHttpProtocol = ({ protocol }: URL): boolean => protocol === "http:" || protocol === "https:";

// Returns true only for urls the browser will load over http(s). Values that use another
// scheme, or that do not parse, return false so callers can fall back to a safe default.
export const isHttpUrl = (url?: string): boolean => {
  const parsed = parseUrl(url);
  return !!parsed && isHttpProtocol(parsed);
};

// Domains that may serve plugin scripts, matched exactly or as a dot-suffix.
const allowedPluginScriptDomains = ["concord.org"];

// Hosts that may serve plugin scripts, matched exactly (any port). These let a
// developer test a locally served plugin script.
const allowedPluginScriptHosts = ["localhost", "127.0.0.1"];

// Returns true only for http(s) plugin script urls served from an allowed host.
// Plugin scripts are loaded via <script src> and so run in the Activity Player's
// own origin, where a scheme check alone is not enough: any https url would still
// execute. Matching is done on the parsed hostname rather than on the url text, so
// lookalikes such as evilconcord.org or concord.org.example.com are rejected.
export const isAllowedPluginScriptUrl = (url?: string): boolean => {
  const parsed = parseUrl(url);
  if (!parsed || !isHttpProtocol(parsed)) return false;
  const { hostname } = parsed;
  if (allowedPluginScriptHosts.includes(hostname)) return true;
  return allowedPluginScriptDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
};
