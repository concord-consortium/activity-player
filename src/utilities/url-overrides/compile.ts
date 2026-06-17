import { ParsedOverride, RegistryJson, CompiledRule, OverrideError } from "./types";

const VALUE_RE = /^[A-Za-z0-9._-]+$/;

// Escape a string so it matches literally inside a regex pattern.
export const regexEscape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

// Escape a param string for injection into a regex pattern.  Stricter than
// regexEscape: also escapes `-` so that a param value such as
// "question-interactives" cannot accidentally form a character-class range
// when the surrounding match template uses `[…]`.
const regexEscapeParam = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/-]/g, "\\$&");

// Escape a string so it is substituted literally by String.prototype.replace.
// The only special character in a replacement string is `$`.
export const replaceEscape = (s: string): string => s.replace(/\$/g, "$$$$");

const PARAM_PLACEHOLDER = "${param}";
const VALUE_PLACEHOLDER = "${value}";

const isParameterized = (entry: { match: string; replace: string }): boolean =>
  entry.match.includes(PARAM_PLACEHOLDER) || entry.replace.includes(PARAM_PLACEHOLDER);

export const compileRule = (
  parsed: ParsedOverride,
  registry: RegistryJson
): { rule?: CompiledRule; error?: OverrideError } => {
  const { key, param, value } = parsed;
  const entry = registry[key];
  if (!entry) {
    return { error: { key, param, value, reason: `Unknown override key: ${key}` } };
  }
  if (!VALUE_RE.test(value)) {
    return { error: { key, param, value, reason: `Value failed charset validation: ${value}` } };
  }
  if (param !== undefined && !VALUE_RE.test(param)) {
    return { error: { key, param, value, reason: `Param failed charset validation: ${param}` } };
  }
  const parameterized = isParameterized(entry);
  if (parameterized && param === undefined) {
    return { error: { key, param, value, reason: `Entry "${key}" requires a param but URL did not provide one` } };
  }
  if (!parameterized && param !== undefined) {
    return { error: { key, param, value, reason: `URL provided a param but entry "${key}" does not accept one` } };
  }

  // Substitute ${param} into match (regex-escaped) and into replace (literal).
  // Substitute ${value} into replace (literal).
  let matchBody = entry.match;
  let replaceBody = entry.replace;
  if (param !== undefined) {
    const escapedParam = regexEscapeParam(param);
    matchBody = matchBody.split(PARAM_PLACEHOLDER).join(escapedParam);
    replaceBody = replaceBody.split(PARAM_PLACEHOLDER).join(replaceEscape(param));
  }
  replaceBody = replaceBody.split(VALUE_PLACEHOLDER).join(replaceEscape(value));

  // Escape literal forward slashes in the match body so the compiled regex source
  // shows `\/` consistently (forward slashes are not regex metacharacters but we
  // normalise them for readability and to satisfy the test contract).
  const escapedMatchBody = matchBody.replace(/\//g, "\\/");
  const pattern = regexEscape(entry.prefix) + escapedMatchBody;
  let regex: RegExp;
  try {
    regex = new RegExp(pattern);
  } catch (e) {
    return { error: { key, param, value, reason: `Regex compile failed: ${(e as Error).message}` } };
  }

  return {
    rule: {
      key,
      param,
      value,
      regex,
      replacement: replaceEscape(entry.prefix) + replaceBody,
      scanAuthoredState: !!entry.scanAuthoredState,
    },
  };
};
