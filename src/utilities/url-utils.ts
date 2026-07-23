// Returns true only for absolute http(s) URLs. Values that use another scheme,
// or that do not parse as an absolute URL (e.g. a relative path), return false
// so callers can fall back to a safe default.
export const isHttpUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
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
  if (!url || !isHttpUrl(url)) return false;
  const { hostname } = new URL(url);
  if (allowedPluginScriptHosts.includes(hostname)) return true;
  return allowedPluginScriptDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
};
