export interface ParsedOverride {
  key: string;
  param?: string;
  value: string;
}

export interface RegistryEntry {
  prefix: string;
  match: string;
  replace: string;
  scanAuthoredState?: boolean;
}

export type RegistryJson = Record<string, RegistryEntry>;

export interface CompiledRule {
  key: string;
  param?: string;
  value: string;
  regex: RegExp;
  replacement: string;
  scanAuthoredState: boolean;
}

export interface OverrideError {
  key: string;
  param?: string;
  value?: string;
  reason: string;
}

export interface OverrideInfo {
  active: CompiledRule[];
  errors: OverrideError[];
  registryFetchFailed: boolean;
}
