import queryString from "query-string";

/**
 * Simplifies query-string library by only returning `string | undefined`, instead
 * of `string | string[] | null | undefined`.
 * @param prop
 */
export const queryValue = (prop: string): string | undefined => {
  const query = queryString.parse(window.location.search);
  const val = query[prop];
  if (!val) return;
  if (Array.isArray(val)) {
    throw `May only have one query parameter for ${prop}. Found: ${val}`;
  }
  return val;
};

/**
 * Append or modify a query parameter value, by default using `replaceState` to update in place
 * without a reload or history push, but optionally with a reload.
 */
export const setQueryValue = (prop: string, value: any, reload = false) => {
  const parsed = queryString.parse(location.search);
  parsed[prop] = value;
  const newQueryString = queryString.stringify(parsed);
  if (reload) {
    location.search = queryString.stringify(parsed);
  } else {
    window.history.replaceState(null, "", "?" + newQueryString);
  }
};
