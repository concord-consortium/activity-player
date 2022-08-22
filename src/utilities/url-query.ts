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
 * returns `true` if prop is present, or has any value except "false"
 */
export const queryValueBoolean = (prop: string): boolean => {
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
export const setQueryValue = (prop: string, value: any, reload = false) => {
  const parsed = queryString.parse(window.location.search);
  parsed[prop] = value;
  const newQueryString = queryString.stringify(parsed);
  if (reload) {
    window.location.search = queryString.stringify(parsed);
  } else {
    window.history.replaceState(null, "", "?" + newQueryString);
  }
};

export const deleteQueryValue = (prop: string, reload = false) => {
  const parsed = queryString.parse(window.location.search);
  delete parsed[prop];
  const newQueryString = queryString.stringify(parsed);
  if (reload) {
    window.location.search = queryString.stringify(parsed);
  } else {
    window.history.replaceState(null, "", "?" + newQueryString);
  }
};

/**
 * Simplifies query-string library by only returning `string | undefined`, instead
 * of `string | string[] | null | undefined`.
 * @param prop
 */
export function hashValue(prop: string): string | undefined {
  const query = queryString.parse(window.location.hash);
  const val = query[prop];
  if (!val) {
    return undefined;
  }
  if (Array.isArray(val)) {
    throw `May only have one hash parameter for ${prop}. Found: ${val}`;
  }
  return val;
}
