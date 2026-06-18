import queryString from "query-string";
import { ParsedOverride } from "./types";

const OVERRIDE_RE = /^override\.([^.=]+)(?:\.([^.=]+))?$/;

export const parseOverrides = (search: string = window.location.search): ParsedOverride[] => {
  const parsed = queryString.parse(search);
  const result: ParsedOverride[] = [];
  for (const [name, value] of Object.entries(parsed)) {
    if (typeof value !== "string" || value === "") continue;
    const m = OVERRIDE_RE.exec(name);
    if (!m) continue;
    const [, key, param] = m;
    result.push({ key, param, value });
  }
  return result;
};
