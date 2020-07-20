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
