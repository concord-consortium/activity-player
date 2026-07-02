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
