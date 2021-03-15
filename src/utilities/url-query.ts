import queryString from "query-string";

// See `README.md` for complete description of parameters and there intended use.
type IQueryKey =
  "__cypressLoggedIn" |
  "__maxIdleTime" |
  "__timeout" |
  "activity" |
  "confirmOfflineManifestInstall" |
  "contentUrl" |
  "domain" |
  "firebaseApp" |
  "mode" |
  "offlineManifest" |
  "page" |
  "portalReport" |
  "runKey" |
  "sequence" |
  "setOfflineManifestAuthoringId" |
  "sourceKey" |
  "token";

// Known Boolean Query Parameters:
type IQueryBoolKey =
  "clearFirestorePersistence" |
  "enableFirestorePersistence" |
  "force_offline_data" | // Will force indexDB storage for testing...
  "preview" |
  "themeButtons";

/**
 * Simplifies query-string library by only returning `string | undefined`, instead
 * of `string | string[] | null | undefined`.
 * @param prop
 */
export const queryValue = (prop: IQueryKey): string | undefined => {
  const query = queryString.parse(window.location.search);
  const val = query[prop];
  if (!val) return;
  if (Array.isArray(val)) {
    throw `May only have one query parameter for ${prop}. Found: ${val}`;
  }
  return val;
};

/**
 * returns `true` if prop is present, or has any value except "false"
 */
export const queryValueBoolean = (prop: IQueryBoolKey): boolean => {
  const query = queryString.parse(window.location.search, {parseBooleans: true});
  const val = query[prop];
  if (val === false) return false;
  // if prop is present, it will be `null`, which we will count as `true`
  return val !== undefined;
};

/**
 * Append or modify a query parameter value, by default using `replaceState` to update in place
 * without a reload or history push, but optionally with a reload.
 */
export const setQueryValue = (prop: IQueryKey|IQueryBoolKey, value: any, reload = false) => {
  const parsed = queryString.parse(location.search);
  parsed[prop] = value;
  const newQueryString = queryString.stringify(parsed);
  if (reload) {
    location.search = queryString.stringify(parsed);
  } else {
    window.history.replaceState(null, "", "?" + newQueryString);
  }
};
