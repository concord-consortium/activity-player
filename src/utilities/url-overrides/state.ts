import { parseOverrides } from "./parse-url-overrides";
import { compileRule } from "./compile";
import { applyRuleToUrl, applyRuleToAuthoredState } from "./apply";
import { fetchRegistry as defaultFetchRegistry } from "./registry";
import { CompiledRule, OverrideInfo, RegistryJson } from "./types";

interface InitDeps {
  fetchRegistry?: () => Promise<RegistryJson>;
  getSearch?: () => string;
}

let info: OverrideInfo = { active: [], errors: [], registryFetchFailed: false };
let initialized = false;
let initPromise: Promise<void> | null = null;

export const resetOverridesForTesting = (): void => {
  info = { active: [], errors: [], registryFetchFailed: false };
  initialized = false;
  initPromise = null;
};

export const hasActiveOverrideParams = (search: string = window.location.search): boolean =>
  parseOverrides(search).length > 0;

export const initializeOverrides = (deps: InitDeps = {}): Promise<void> => {
  if (initPromise) return initPromise;
  const fetchFn = deps.fetchRegistry ?? defaultFetchRegistry;
  const getSearch = deps.getSearch ?? (() => window.location.search);

  const parsed = parseOverrides(getSearch());
  if (parsed.length === 0) {
    initialized = true;
    initPromise = Promise.resolve();
    return initPromise;
  }

  initPromise = (async () => {
    let registry: RegistryJson;
    try {
      registry = await fetchFn();
    } catch (e) {
      info = {
        active: [],
        errors: [],
        registryFetchFailed: true,
      };
      initialized = true;
      return;
    }
    const sorted = [...parsed].sort((a, b) => a.key.localeCompare(b.key));
    const active: CompiledRule[] = [];
    const errors: OverrideInfo["errors"] = [];
    for (const override of sorted) {
      try {
        const { rule, error } = compileRule(override, registry);
        if (rule) active.push(rule);
        if (error) errors.push(error);
      } catch (e) {
        errors.push({
          key: override.key,
          param: override.param,
          value: override.value,
          reason: `Compile threw: ${(e as Error).message}`,
        });
      }
    }
    info = { active, errors, registryFetchFailed: false };
    initialized = true;
  })();

  return initPromise;
};

export const applyOverrides = (url: string): string => {
  if (!initialized) return url;
  let result = url;
  for (const rule of info.active) {
    result = applyRuleToUrl(rule, result);
  }
  return result;
};

export const applyOverridesToAuthoredState = (state: string): string => {
  if (!initialized) return state;
  let result = state;
  for (const rule of info.active) {
    if (rule.scanAuthoredState) {
      result = applyRuleToAuthoredState(rule, result);
    }
  }
  return result;
};

export const getOverrideInfo = (): OverrideInfo => info;
