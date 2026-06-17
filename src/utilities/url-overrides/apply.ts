import { CompiledRule } from "./types";

const replaceAll = (input: string, regex: RegExp, replacement: string): string => {
  // CompiledRule.regex is not declared with the global flag; use a per-call global copy
  // so that all occurrences are replaced (each call site here expects multi-occurrence handling).
  const global = new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g");
  return input.replace(global, replacement);
};

export const applyRuleToUrl = (rule: CompiledRule, url: string): string => {
  // Pass A: raw regex on the full URL string
  let result = replaceAll(url, rule.regex, rule.replacement);

  // Pass B: parse as URL, iterate decoded query-param values, re-apply, write back
  try {
    const parsed = new URL(result);
    let changed = false;
    const newValues: Array<[string, string]> = [];
    parsed.searchParams.forEach((value, name) => {
      const rewritten = replaceAll(value, rule.regex, rule.replacement);
      newValues.push([name, rewritten]);
      if (rewritten !== value) changed = true;
    });
    if (changed) {
      // Rebuild searchParams to preserve order
      const newParams = new URLSearchParams();
      newValues.forEach(([name, value]) => newParams.append(name, value));
      parsed.search = newParams.toString();
      result = parsed.toString();
    }
  } catch {
    // Not a parseable URL; Pass A result is fine.
  }
  return result;
};

export const applyRuleToAuthoredState = (rule: CompiledRule, state: string): string =>
  replaceAll(state, rule.regex, rule.replacement);
