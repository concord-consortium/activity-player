# Interactive URL Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a generic URL-parameter override mechanism in the activity-player that rewrites interactive iframe URLs based on rules fetched from a remote registry. See spec at `docs/superpowers/specs/2026-06-17-interactive-url-overrides-design.md`.

**Architecture:** Pure utility modules under `src/utilities/url-overrides/` handle the four phases (parse URL params, fetch registry, compile rules, apply rules). A module-level state singleton coordinates initialization and exposes synchronous apply functions for use at three iframe-rendering sites. A new `OverrideBanner` React component displays which overrides are active. Activity rendering is blocked on registry initialization when override params are present.

**Tech Stack:** TypeScript, React, Jest, `@testing-library/react`. Uses the existing `query-string` npm package for query-string parsing.

## Global Constraints

- Registry URL is hardcoded to `https://models-resources.concord.org/runtime-config/interactive-override-registry.json`.
- Value and param charset: `/^[A-Za-z0-9._-]+$/`. Anything else → not applied, banner warning.
- Registry fetched only when at least one `override.<key>=...` URL param is present (no fetch in the normal-use path).
- Apply functions MUST be synchronous (they are called from React render).
- Multiple active overrides are applied in alphabetical order of their `<key>`.
- Each registry entry's `prefix` is regex-escaped before being prepended to `match`.
- `${param}` is regex-escaped before substitution into `match`, and substituted literally into `replace`.
- `${value}` is substituted literally into `replace`. Not legal in `match`.
- An entry is parameterized iff `${param}` appears in `match` or `replace`. Mismatch between URL form (param present/absent) and entry shape (parameterized/not) → not applied, banner warning.
- `scanAuthoredState` defaults to `false`. When `true`, the rule is also applied to the interactive's `authored_state` value (a JSON string).
- URL application is dual-pass: raw regex on the URL string, then parsed-URL pass over decoded `searchParams` values.
- `authored_state` application is a single raw regex pass.

## File Structure

**Create:**
- `src/utilities/url-overrides/types.ts` — TypeScript types
- `src/utilities/url-overrides/parse-url-overrides.ts` + `.test.ts`
- `src/utilities/url-overrides/compile.ts` + `.test.ts`
- `src/utilities/url-overrides/apply.ts` + `.test.ts`
- `src/utilities/url-overrides/registry.ts` + `.test.ts`
- `src/utilities/url-overrides/state.ts` + `.test.ts`
- `src/components/override-banner.tsx` + `.scss` + `.test.tsx`

**Modify:**
- `src/components/activity-page/managed-interactive/managed-interactive.tsx` — apply override to `iframeUrl` and to `embeddable.authored_state` before passing to iframe
- `src/components/activity-page/managed-interactive/iframe-runtime.tsx` — apply override to `showModal`-supplied `url` at `src={url}`
- `src/components/activity-page/managed-interactive/lightbox.tsx` — apply override to `url` at the iframe `src`
- `src/components/app.tsx` — call `initializeOverrides()` in `componentDidMount`, mount `<OverrideBanner/>` in render

---

### Task 1: Types and URL parameter parsing

**Files:**
- Create: `src/utilities/url-overrides/types.ts`
- Create: `src/utilities/url-overrides/parse-url-overrides.ts`
- Test: `src/utilities/url-overrides/parse-url-overrides.test.ts`

**Interfaces:**
- Produces: `ParsedOverride { key: string; param?: string; value: string }`, `RegistryEntry { prefix: string; match: string; replace: string; scanAuthoredState?: boolean }`, `RegistryJson = Record<string, RegistryEntry>`, function `parseOverrides(search?: string): ParsedOverride[]`.

- [ ] **Step 1: Write the failing test**

Create `src/utilities/url-overrides/parse-url-overrides.test.ts`:

```typescript
import { parseOverrides } from "./parse-url-overrides";

describe("parseOverrides", () => {
  it("returns empty array when no override params present", () => {
    expect(parseOverrides("?foo=bar&baz=qux")).toEqual([]);
  });

  it("parses a two-segment override", () => {
    expect(parseOverrides("?override.qi=toolbar-accessibility")).toEqual([
      { key: "qi", param: undefined, value: "toolbar-accessibility" }
    ]);
  });

  it("parses a three-segment override with a param", () => {
    expect(parseOverrides("?override.mr.question-interactives=my-branch")).toEqual([
      { key: "mr", param: "question-interactives", value: "my-branch" }
    ]);
  });

  it("parses multiple overrides", () => {
    const result = parseOverrides("?override.qi=foo&override.wildfire=bar&unrelated=x");
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ key: "qi", param: undefined, value: "foo" });
    expect(result).toContainEqual({ key: "wildfire", param: undefined, value: "bar" });
  });

  it("ignores override params with missing value", () => {
    expect(parseOverrides("?override.qi=")).toEqual([]);
  });

  it("ignores override params with more than three segments", () => {
    expect(parseOverrides("?override.a.b.c=x")).toEqual([]);
  });

  it("ignores duplicate keys by taking only the first occurrence (array values)", () => {
    // query-string returns an array when the same key appears twice;
    // we drop those rather than guessing which one the author meant.
    expect(parseOverrides("?override.qi=a&override.qi=b")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/utilities/url-overrides/parse-url-overrides.test.ts`
Expected: FAIL (`Cannot find module './parse-url-overrides'`)

- [ ] **Step 3: Create the types file**

Create `src/utilities/url-overrides/types.ts`:

```typescript
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
```

- [ ] **Step 4: Implement parseOverrides**

Create `src/utilities/url-overrides/parse-url-overrides.ts`:

```typescript
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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/utilities/url-overrides/parse-url-overrides.test.ts`
Expected: PASS (all 7 tests)

- [ ] **Step 6: Commit**

```bash
git add src/utilities/url-overrides/
git commit -m "feat(AP-115): add URL override param parsing and types"
```

---

### Task 2: Rule compilation

**Files:**
- Create: `src/utilities/url-overrides/compile.ts`
- Test: `src/utilities/url-overrides/compile.test.ts`

**Interfaces:**
- Consumes: `ParsedOverride`, `RegistryJson`, `CompiledRule`, `OverrideError` from Task 1's `types.ts`.
- Produces: `compileRule(parsed: ParsedOverride, registry: RegistryJson): { rule?: CompiledRule; error?: OverrideError }`. Also exports `regexEscape(s: string): string` and `replaceEscape(s: string): string` helpers for reuse.

- [ ] **Step 1: Write the failing test**

Create `src/utilities/url-overrides/compile.test.ts`:

```typescript
import { compileRule } from "./compile";
import { RegistryJson } from "./types";

const registry: RegistryJson = {
  qi: {
    prefix: "https://models-resources.concord.org/question-interactives/",
    match: "(branch|version)/[^/]+/",
    replace: "branch/${value}/",
  },
  mr: {
    prefix: "https://models-resources.concord.org/",
    match: "${param}/(?:(?:branch|version)/[^/]+/)?",
    replace: "${param}/branch/${value}/",
  },
  wildfire: {
    prefix: "https://wildfire.concord.org/",
    match: "(branch/[^/]+/)?",
    replace: "branch/${value}/",
    scanAuthoredState: true,
  },
};

describe("compileRule", () => {
  it("compiles a simple non-parameterized rule", () => {
    const { rule, error } = compileRule(
      { key: "qi", value: "foo" },
      registry
    );
    expect(error).toBeUndefined();
    expect(rule).toBeDefined();
    expect(rule!.regex.source).toBe(
      "https:\\/\\/models-resources\\.concord\\.org\\/question-interactives\\/(branch|version)\\/[^\\/]+\\/"
    );
    expect(rule!.replacement).toBe(
      "https://models-resources.concord.org/question-interactives/branch/foo/"
    );
    expect(rule!.scanAuthoredState).toBe(false);
  });

  it("compiles a parameterized rule", () => {
    const { rule, error } = compileRule(
      { key: "mr", param: "question-interactives", value: "my-branch" },
      registry
    );
    expect(error).toBeUndefined();
    expect(rule!.replacement).toBe(
      "https://models-resources.concord.org/question-interactives/branch/my-branch/"
    );
    // ${param} got substituted into match — the literal "question-interactives" must appear
    expect(rule!.regex.test("https://models-resources.concord.org/question-interactives/")).toBe(true);
    expect(rule!.regex.test("https://models-resources.concord.org/other-project/")).toBe(false);
  });

  it("propagates scanAuthoredState from the entry", () => {
    const { rule } = compileRule({ key: "wildfire", value: "master" }, registry);
    expect(rule!.scanAuthoredState).toBe(true);
  });

  it("rejects unknown keys", () => {
    const { rule, error } = compileRule({ key: "nope", value: "x" }, registry);
    expect(rule).toBeUndefined();
    expect(error!.reason).toMatch(/unknown/i);
  });

  it("rejects values that fail charset validation", () => {
    const { error } = compileRule({ key: "qi", value: "has space" }, registry);
    expect(error!.reason).toMatch(/charset/i);
  });

  it("rejects params that fail charset validation", () => {
    const { error } = compileRule(
      { key: "mr", param: "has space", value: "x" },
      registry
    );
    expect(error!.reason).toMatch(/charset/i);
  });

  it("rejects two-segment URL form against a parameterized entry", () => {
    const { error } = compileRule({ key: "mr", value: "x" }, registry);
    expect(error!.reason).toMatch(/param/i);
  });

  it("rejects three-segment URL form against a non-parameterized entry", () => {
    const { error } = compileRule(
      { key: "qi", param: "extra", value: "x" },
      registry
    );
    expect(error!.reason).toMatch(/param/i);
  });

  it("regex-escapes the param so metacharacters cannot inject pattern semantics", () => {
    // (Won't normally reach this because charset rejects metachars first,
    // but defense-in-depth: if charset were bypassed, the escape still holds.)
    // Verify by inspecting the compiled regex source.
    const { rule } = compileRule(
      { key: "mr", param: "question-interactives", value: "x" },
      registry
    );
    expect(rule!.regex.source).toContain("question\\-interactives");
  });

  it("returns an error when prefix is malformed (cannot be compiled)", () => {
    // Construct a registry with an entry whose match is an unbalanced group.
    const bad: RegistryJson = {
      broken: { prefix: "https://x/", match: "(unclosed", replace: "y" },
    };
    const { rule, error } = compileRule({ key: "broken", value: "x" }, bad);
    expect(rule).toBeUndefined();
    expect(error!.reason).toMatch(/regex/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/utilities/url-overrides/compile.test.ts`
Expected: FAIL (`Cannot find module './compile'`)

- [ ] **Step 3: Implement compile.ts**

Create `src/utilities/url-overrides/compile.ts`:

```typescript
import { ParsedOverride, RegistryJson, CompiledRule, OverrideError } from "./types";

const VALUE_RE = /^[A-Za-z0-9._-]+$/;

// Escape a string so it matches literally inside a regex pattern.
export const regexEscape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

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
    const escapedParam = regexEscape(param);
    matchBody = matchBody.split(PARAM_PLACEHOLDER).join(escapedParam);
    replaceBody = replaceBody.split(PARAM_PLACEHOLDER).join(replaceEscape(param));
  }
  replaceBody = replaceBody.split(VALUE_PLACEHOLDER).join(replaceEscape(value));

  const pattern = regexEscape(entry.prefix) + matchBody;
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/utilities/url-overrides/compile.test.ts`
Expected: PASS (all 10 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utilities/url-overrides/compile.ts src/utilities/url-overrides/compile.test.ts
git commit -m "feat(AP-115): compile registry entries into URL-rewrite rules"
```

---

### Task 3: Apply rules to URLs and authored_state

**Files:**
- Create: `src/utilities/url-overrides/apply.ts`
- Test: `src/utilities/url-overrides/apply.test.ts`

**Interfaces:**
- Consumes: `CompiledRule` from `types.ts`.
- Produces: `applyRuleToUrl(rule: CompiledRule, url: string): string`, `applyRuleToAuthoredState(rule: CompiledRule, state: string): string`.

- [ ] **Step 1: Write the failing test**

Create `src/utilities/url-overrides/apply.test.ts`:

```typescript
import { applyRuleToUrl, applyRuleToAuthoredState } from "./apply";
import { compileRule } from "./compile";
import { RegistryJson } from "./types";

const registry: RegistryJson = {
  qi: {
    prefix: "https://models-resources.concord.org/question-interactives/",
    match: "(branch|version)/[^/]+/",
    replace: "branch/${value}/",
  },
  wildfire: {
    prefix: "https://wildfire.concord.org/",
    match: "(branch/[^/]+/)?",
    replace: "branch/${value}/",
    scanAuthoredState: true,
  },
};

const qiRule = compileRule({ key: "qi", value: "my-branch" }, registry).rule!;
const wildfireRule = compileRule({ key: "wildfire", value: "master" }, registry).rule!;

describe("applyRuleToUrl", () => {
  it("rewrites a matching URL (raw pass)", () => {
    const input = "https://models-resources.concord.org/question-interactives/version/1.2.3/multiple-choice/index.html";
    const expected = "https://models-resources.concord.org/question-interactives/branch/my-branch/multiple-choice/index.html";
    expect(applyRuleToUrl(qiRule, input)).toBe(expected);
  });

  it("leaves non-matching URLs unchanged", () => {
    const input = "https://other-host.example.com/something/branch/foo/";
    expect(applyRuleToUrl(qiRule, input)).toBe(input);
  });

  it("rewrites a URL embedded as a decoded query param (decoded pass)", () => {
    // A wrapper URL with the inner URL passed as a percent-encoded query param.
    const inner = "https://models-resources.concord.org/question-interactives/branch/old/multiple-choice/";
    const wrapper = `https://wrapper.example/?inner=${encodeURIComponent(inner)}`;
    const result = applyRuleToUrl(qiRule, wrapper);
    const expectedInner = "https://models-resources.concord.org/question-interactives/branch/my-branch/multiple-choice/";
    const u = new URL(result);
    expect(u.searchParams.get("inner")).toBe(expectedInner);
  });

  it("rewrites a URL that adds a branch where there was none (optional group)", () => {
    const input = "https://wildfire.concord.org/index.html";
    const expected = "https://wildfire.concord.org/branch/master/index.html";
    expect(applyRuleToUrl(wildfireRule, input)).toBe(expected);
  });

  it("returns the raw-pass result if the input is not a parseable URL", () => {
    // Pass B is best-effort; a non-URL string still works for Pass A.
    const input = "not a url https://models-resources.concord.org/question-interactives/branch/x/y";
    const result = applyRuleToUrl(qiRule, input);
    expect(result).toContain("/branch/my-branch/");
  });
});

describe("applyRuleToAuthoredState", () => {
  it("rewrites every match in the authored_state string", () => {
    const state = JSON.stringify({
      inner: "https://wildfire.concord.org/index.html",
      other: "https://wildfire.concord.org/branch/old/page.html",
    });
    const result = applyRuleToAuthoredState(wildfireRule, state);
    const parsed = JSON.parse(result);
    expect(parsed.inner).toBe("https://wildfire.concord.org/branch/master/index.html");
    expect(parsed.other).toBe("https://wildfire.concord.org/branch/master/page.html");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/utilities/url-overrides/apply.test.ts`
Expected: FAIL (`Cannot find module './apply'`)

- [ ] **Step 3: Implement apply.ts**

Create `src/utilities/url-overrides/apply.ts`:

```typescript
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
    for (const [name, value] of parsed.searchParams.entries()) {
      const rewritten = replaceAll(value, rule.regex, rule.replacement);
      newValues.push([name, rewritten]);
      if (rewritten !== value) changed = true;
    }
    if (changed) {
      // Rebuild searchParams to preserve order
      const newParams = new URLSearchParams();
      for (const [name, value] of newValues) newParams.append(name, value);
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/utilities/url-overrides/apply.test.ts`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utilities/url-overrides/apply.ts src/utilities/url-overrides/apply.test.ts
git commit -m "feat(AP-115): apply rules to URLs (dual-pass) and authored_state"
```

---

### Task 4: Registry fetch

**Files:**
- Create: `src/utilities/url-overrides/registry.ts`
- Test: `src/utilities/url-overrides/registry.test.ts`

**Interfaces:**
- Consumes: `RegistryJson` from `types.ts`.
- Produces: `fetchRegistry(): Promise<RegistryJson>` and exported constant `REGISTRY_URL`.

- [ ] **Step 1: Write the failing test**

Create `src/utilities/url-overrides/registry.test.ts`:

```typescript
import { fetchRegistry, REGISTRY_URL } from "./registry";

describe("fetchRegistry", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("uses the hardcoded registry URL", () => {
    expect(REGISTRY_URL).toBe(
      "https://models-resources.concord.org/runtime-config/interactive-override-registry.json"
    );
  });

  it("returns the parsed JSON on success", async () => {
    const body = {
      qi: { prefix: "https://x/", match: "y", replace: "z" },
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => body,
    }) as any;
    const result = await fetchRegistry();
    expect(global.fetch).toHaveBeenCalledWith(REGISTRY_URL, expect.objectContaining({ cache: "no-cache" }));
    expect(result).toEqual(body);
  });

  it("rejects when the response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as any;
    await expect(fetchRegistry()).rejects.toThrow(/404/);
  });

  it("rejects when the body is not valid JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => { throw new SyntaxError("Unexpected token"); },
    }) as any;
    await expect(fetchRegistry()).rejects.toThrow();
  });

  it("rejects when the parsed body is not an object", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ["not", "an", "object"],
    }) as any;
    await expect(fetchRegistry()).rejects.toThrow(/object/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/utilities/url-overrides/registry.test.ts`
Expected: FAIL (`Cannot find module './registry'`)

- [ ] **Step 3: Implement registry.ts**

Create `src/utilities/url-overrides/registry.ts`:

```typescript
import { RegistryJson } from "./types";

export const REGISTRY_URL =
  "https://models-resources.concord.org/runtime-config/interactive-override-registry.json";

export const fetchRegistry = async (): Promise<RegistryJson> => {
  const response = await fetch(REGISTRY_URL, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Registry fetch failed with status ${response.status}`);
  }
  const body = await response.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Registry body is not a JSON object");
  }
  return body as RegistryJson;
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/utilities/url-overrides/registry.test.ts`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utilities/url-overrides/registry.ts src/utilities/url-overrides/registry.test.ts
git commit -m "feat(AP-115): fetch override registry JSON with no-cache"
```

---

### Task 5: State module (initialization + sync apply functions)

**Files:**
- Create: `src/utilities/url-overrides/state.ts`
- Test: `src/utilities/url-overrides/state.test.ts`

**Interfaces:**
- Consumes: `parseOverrides` (Task 1), `compileRule` (Task 2), `applyRuleToUrl` / `applyRuleToAuthoredState` (Task 3), `fetchRegistry` (Task 4).
- Produces:
  - `initializeOverrides(deps?: { fetchRegistry?, getSearch? }): Promise<void>` — call once at app start.
  - `resetOverridesForTesting(): void` — clear module state between tests.
  - `applyOverrides(url: string): string` — sync; returns input unchanged if not initialized.
  - `applyOverridesToAuthoredState(state: string): string` — sync.
  - `getOverrideInfo(): OverrideInfo` — for the banner.
  - `hasActiveOverrideParams(): boolean` — checks the URL synchronously, before initialize is called.

- [ ] **Step 1: Write the failing test**

Create `src/utilities/url-overrides/state.test.ts`:

```typescript
import {
  initializeOverrides,
  resetOverridesForTesting,
  applyOverrides,
  applyOverridesToAuthoredState,
  getOverrideInfo,
  hasActiveOverrideParams,
} from "./state";
import { RegistryJson } from "./types";

const validRegistry: RegistryJson = {
  qi: {
    prefix: "https://models-resources.concord.org/question-interactives/",
    match: "(branch|version)/[^/]+/",
    replace: "branch/${value}/",
  },
  wildfire: {
    prefix: "https://wildfire.concord.org/",
    match: "(branch/[^/]+/)?",
    replace: "branch/${value}/",
    scanAuthoredState: true,
  },
};

describe("override state module", () => {
  beforeEach(() => resetOverridesForTesting());

  it("hasActiveOverrideParams returns false when URL has no override params", () => {
    expect(hasActiveOverrideParams("?foo=bar")).toBe(false);
  });

  it("hasActiveOverrideParams returns true when URL has an override param", () => {
    expect(hasActiveOverrideParams("?override.qi=x")).toBe(true);
  });

  it("does not fetch when no override params are present", async () => {
    const fetchRegistry = jest.fn();
    await initializeOverrides({ fetchRegistry, getSearch: () => "?nothing=here" });
    expect(fetchRegistry).not.toHaveBeenCalled();
    expect(getOverrideInfo().active).toHaveLength(0);
    expect(getOverrideInfo().errors).toHaveLength(0);
  });

  it("fetches and compiles rules when override params are present", async () => {
    await initializeOverrides({
      fetchRegistry: async () => validRegistry,
      getSearch: () => "?override.qi=my-branch",
    });
    const info = getOverrideInfo();
    expect(info.active).toHaveLength(1);
    expect(info.active[0].key).toBe("qi");
    expect(info.errors).toHaveLength(0);
  });

  it("applyOverrides is a no-op before initialization", () => {
    const url = "https://models-resources.concord.org/question-interactives/branch/old/x";
    expect(applyOverrides(url)).toBe(url);
  });

  it("applyOverrides rewrites URLs after initialization", async () => {
    await initializeOverrides({
      fetchRegistry: async () => validRegistry,
      getSearch: () => "?override.qi=my-branch",
    });
    const url = "https://models-resources.concord.org/question-interactives/version/1.2.3/foo/";
    expect(applyOverrides(url)).toBe(
      "https://models-resources.concord.org/question-interactives/branch/my-branch/foo/"
    );
  });

  it("applyOverridesToAuthoredState only applies rules with scanAuthoredState=true", async () => {
    await initializeOverrides({
      fetchRegistry: async () => validRegistry,
      getSearch: () => "?override.qi=my-branch&override.wildfire=stable",
    });
    const state = JSON.stringify({
      qiUrl: "https://models-resources.concord.org/question-interactives/branch/x/y/",
      wildfireUrl: "https://wildfire.concord.org/page",
    });
    const result = JSON.parse(applyOverridesToAuthoredState(state));
    // qi has scanAuthoredState=false (default), wildfire has it true
    expect(result.qiUrl).toBe("https://models-resources.concord.org/question-interactives/branch/x/y/");
    expect(result.wildfireUrl).toBe("https://wildfire.concord.org/branch/stable/page");
  });

  it("applies multiple overrides in alphabetical key order", async () => {
    // Both qi and wildfire are present; order matters only for determinism.
    await initializeOverrides({
      fetchRegistry: async () => validRegistry,
      getSearch: () => "?override.wildfire=a&override.qi=b",
    });
    const info = getOverrideInfo();
    expect(info.active.map(r => r.key)).toEqual(["qi", "wildfire"]);
  });

  it("records registry-fetch failure", async () => {
    await initializeOverrides({
      fetchRegistry: async () => { throw new Error("boom"); },
      getSearch: () => "?override.qi=x",
    });
    const info = getOverrideInfo();
    expect(info.registryFetchFailed).toBe(true);
    expect(info.active).toHaveLength(0);
  });

  it("records compile errors per override (e.g. unknown key)", async () => {
    await initializeOverrides({
      fetchRegistry: async () => validRegistry,
      getSearch: () => "?override.qi=ok&override.nope=fail",
    });
    const info = getOverrideInfo();
    expect(info.active.map(r => r.key)).toEqual(["qi"]);
    expect(info.errors.map(e => e.key)).toEqual(["nope"]);
  });

  it("initializeOverrides is idempotent across multiple calls", async () => {
    const fetchRegistry = jest.fn().mockResolvedValue(validRegistry);
    const getSearch = () => "?override.qi=x";
    await initializeOverrides({ fetchRegistry, getSearch });
    await initializeOverrides({ fetchRegistry, getSearch });
    expect(fetchRegistry).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/utilities/url-overrides/state.test.ts`
Expected: FAIL (`Cannot find module './state'`)

- [ ] **Step 3: Implement state.ts**

Create `src/utilities/url-overrides/state.ts`:

```typescript
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
      const { rule, error } = compileRule(override, registry);
      if (rule) active.push(rule);
      if (error) errors.push(error);
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/utilities/url-overrides/state.test.ts`
Expected: PASS (all 11 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utilities/url-overrides/state.ts src/utilities/url-overrides/state.test.ts
git commit -m "feat(AP-115): coordinate registry fetch and rule application"
```

---

### Task 6: Override banner UI

**Files:**
- Create: `src/components/override-banner.tsx`
- Create: `src/components/override-banner.scss`
- Test: `src/components/override-banner.test.tsx`

**Interfaces:**
- Consumes: `OverrideInfo` from `types.ts`. Importable singleton accessor `getOverrideInfo` from `state.ts`.
- Produces: `OverrideBanner: React.FC<{ info: OverrideInfo }>`.

The banner takes its data as a prop (rather than reading the singleton directly) so it is easy to test and renderable from any parent that already has access to `info`.

- [ ] **Step 1: Write the failing test**

Create `src/components/override-banner.test.tsx`:

```typescript
import React from "react";
import { render } from "@testing-library/react";
import { OverrideBanner } from "./override-banner";
import { OverrideInfo } from "../utilities/url-overrides/types";

const emptyInfo: OverrideInfo = { active: [], errors: [], registryFetchFailed: false };

const mkRule = (key: string, param: string | undefined, value: string) => ({
  key,
  param,
  value,
  regex: /x/,
  replacement: "",
  scanAuthoredState: false,
});

describe("OverrideBanner", () => {
  it("renders nothing when there are no active overrides and no errors", () => {
    const { container } = render(<OverrideBanner info={emptyInfo} />);
    expect(container.firstChild).toBeNull();
  });

  it("lists each active override", () => {
    const info: OverrideInfo = {
      active: [mkRule("qi", undefined, "toolbar-accessibility"), mkRule("mr", "tectonic-explorer", "fix")],
      errors: [],
      registryFetchFailed: false,
    };
    const { getByText } = render(<OverrideBanner info={info} />);
    expect(getByText(/override\.qi\s*=\s*toolbar-accessibility/)).toBeInTheDocument();
    expect(getByText(/override\.mr\.tectonic-explorer\s*=\s*fix/)).toBeInTheDocument();
  });

  it("shows a registry-fetch-failed message", () => {
    const info: OverrideInfo = { active: [], errors: [], registryFetchFailed: true };
    const { getByText } = render(<OverrideBanner info={info} />);
    expect(getByText(/registry.*not.*loaded/i)).toBeInTheDocument();
  });

  it("shows compile errors", () => {
    const info: OverrideInfo = {
      active: [],
      errors: [{ key: "nope", reason: "Unknown override key: nope" }],
      registryFetchFailed: false,
    };
    const { getByText } = render(<OverrideBanner info={info} />);
    expect(getByText(/Unknown override key: nope/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/components/override-banner.test.tsx`
Expected: FAIL (`Cannot find module './override-banner'`)

- [ ] **Step 3: Implement override-banner.tsx**

Create `src/components/override-banner.scss`:

```scss
@import "./vars.scss";

.override-banner {
  display: flex;
  flex-direction: column;
  justify-content: center;
  background-color: $cc-orange;
  color: black;
  font-size: pxToRem(14);
  padding: 10px;
  width: 100%;
  gap: 4px;

  .override-banner-row {
    text-align: center;
  }

  .override-banner-error {
    color: darkred;
  }
}
```

Create `src/components/override-banner.tsx`:

```typescript
import React from "react";
import { OverrideInfo } from "../utilities/url-overrides/types";

import "./override-banner.scss";

interface IProps {
  info: OverrideInfo;
}

const formatRule = (rule: OverrideInfo["active"][number]): string => {
  const lhs = rule.param !== undefined
    ? `override.${rule.key}.${rule.param}`
    : `override.${rule.key}`;
  return `${lhs} = ${rule.value}`;
};

const formatError = (error: OverrideInfo["errors"][number]): string => {
  const lhs = error.param !== undefined
    ? `override.${error.key}.${error.param}`
    : `override.${error.key}`;
  return `${lhs}: ${error.reason}`;
};

export const OverrideBanner: React.FC<IProps> = ({ info }) => {
  const hasContent = info.active.length > 0 || info.errors.length > 0 || info.registryFetchFailed;
  if (!hasContent) return null;
  return (
    <div className="override-banner">
      {info.registryFetchFailed && (
        <div className="override-banner-row override-banner-error">
          Override registry could not be loaded.
        </div>
      )}
      {info.active.map(rule => (
        <div className="override-banner-row" key={`active-${rule.key}-${rule.param ?? ""}`}>
          Active override: {formatRule(rule)}
        </div>
      ))}
      {info.errors.map((error, i) => (
        <div className="override-banner-row override-banner-error" key={`error-${i}`}>
          {formatError(error)}
        </div>
      ))}
    </div>
  );
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest src/components/override-banner.test.tsx`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/override-banner.tsx src/components/override-banner.scss src/components/override-banner.test.tsx
git commit -m "feat(AP-115): add OverrideBanner showing active overrides and errors"
```

---

### Task 7: Wire override initialization and banner into app.tsx

**Files:**
- Modify: `src/components/app.tsx`

**Interfaces:**
- Consumes: `initializeOverrides`, `getOverrideInfo`, `hasActiveOverrideParams` from `state.ts`; `OverrideBanner` from `override-banner.tsx`; `OverrideInfo` from `types.ts`.
- Produces: nothing new; this is integration.

The initialization happens in `componentDidMount`. While the registry is being fetched, `loadingOverrides` is true and a small loading indicator replaces the activity body. Once `initializeOverrides()` resolves, `loadingOverrides` flips to false and the activity renders with overrides applied. If no override params are present, the fetch is skipped and there is no visible delay.

- [ ] **Step 1: Add imports to app.tsx**

In `src/components/app.tsx`, add these imports near the other component and utility imports:

```typescript
import { OverrideBanner } from "./override-banner";
import {
  initializeOverrides,
  getOverrideInfo,
  hasActiveOverrideParams,
} from "../utilities/url-overrides/state";
import { OverrideInfo } from "../utilities/url-overrides/types";
```

- [ ] **Step 2: Add state fields**

The `IState` interface is at line 110. Add these two fields:

```typescript
  loadingOverrides: boolean;
  overrideInfo: OverrideInfo;
```

Find the default state initializer (search for `showDefunctBanner: false,` — it sits in the constructor's `state` initialization around line 158). Next to it add:

```typescript
  loadingOverrides: hasActiveOverrideParams(),
  overrideInfo: { active: [], errors: [], registryFetchFailed: false },
```

- [ ] **Step 3: Await override initialization at the top of componentDidMount**

`componentDidMount` is `async` and starts at line 199. Inside the `try` block (line 200 onward), make the very first action awaiting override initialization, then setting state. Insert these two lines immediately after `try {` (before the existing line 201 that reads `teacherEditionMode`):

```typescript
      await initializeOverrides();
      this.setState({ loadingOverrides: false, overrideInfo: getOverrideInfo() });
```

Rationale: any later code that may render interactives must see overrides applied. Awaiting at the top ensures that.

- [ ] **Step 4: Mount the banner in render()**

In `render()`, the existing banner block is at lines 475–478. Add the override banner as the last entry in that block (since it relates to the page's URL params and reads naturally below the others):

```typescript
                        { this.state.showDefunctBanner && <DefunctBanner/> }
                        { this.state.showWarning && <WarningBanner/> }
                        { isOfferingLocked(this.state.portalData) && <LockedBanner isSequence={!!this.state.sequence}/> }
                        { this.state.teacherEditionMode && <TeacherEditionBanner/>}
                        <OverrideBanner info={this.state.overrideInfo}/>
```

(`OverrideBanner` returns `null` when there is nothing to show, so unconditional mounting is fine.)

- [ ] **Step 5: Gate the activity body on `!loadingOverrides`**

In `render()` at line 479–489, the activity body is the final branch of the ternary chain calling `this.renderActivity()` at line 489. Wrap that branch so that while overrides are loading the activity does not render. Replace lines 479–489:

```typescript
                        { this.state.errorType && !this.state.activity
                          ? <div className={`activity fixed-width-${kDefaultFixedWidthLayout}`}>
                              <Error type={this.state.errorType} />
                            </div>
                          : this.state.showSequenceIntro
                            ? <SequenceIntroduction
                                sequence={this.state.sequence}
                                username={this.state.username}
                                onSelectActivity={this.handleSelectActivity}
                              />
                            : this.state.loadingOverrides
                              ? <div className="loading">Loading overrides…</div>
                              : this.renderActivity() }
```

This gates only the activity body — the error UI and sequence intro still render during the brief override-loading window.

- [ ] **Step 6: Run the existing app.test.tsx to verify no regressions**

Run: `npx jest src/components/app.test.tsx`
Expected: PASS (no regressions). If the test file mocks `componentDidMount` work, adjust mocks as needed; if it does not exist, skip this step.

- [ ] **Step 7: Run the full test suite to verify nothing else broke**

Run: `npm test -- --watchAll=false`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/app.tsx
git commit -m "feat(AP-115): initialize overrides and mount OverrideBanner in app"
```

---

### Task 8: Apply overrides at the three iframe-rendering sites

**Files:**
- Modify: `src/components/activity-page/managed-interactive/managed-interactive.tsx`
- Modify: `src/components/activity-page/managed-interactive/iframe-runtime.tsx`
- Modify: `src/components/activity-page/managed-interactive/lightbox.tsx`

**Interfaces:**
- Consumes: `applyOverrides`, `applyOverridesToAuthoredState` from `state.ts`.

- [ ] **Step 1: Read the three exact insertion sites**

Read these line ranges so the insertions match the surrounding code style:
- `src/components/activity-page/managed-interactive/managed-interactive.tsx` lines 340–360 (the `iframeUrl` computation)
- `src/components/activity-page/managed-interactive/iframe-runtime.tsx` lines 510–525 (the `<iframe src={url}` element)
- `src/components/activity-page/managed-interactive/lightbox.tsx` lines 85–95 (the iframe `src={url}`)

- [ ] **Step 2: Apply overrides at the managed-interactive site**

In `managed-interactive.tsx`, add this import near the other utility imports:

```typescript
import { applyOverrides, applyOverridesToAuthoredState } from "../../../utilities/url-overrides/state";
```

(Confirm the relative path: `src/components/activity-page/managed-interactive/` → `src/utilities/url-overrides/` is `../../../utilities/url-overrides/state`.)

Locate line 349:

```typescript
  const iframeUrl = activeDialog?.url || (embeddable.url_fragment ? url + embeddable.url_fragment : url);
```

Replace with:

```typescript
  const iframeUrl = applyOverrides(
    activeDialog?.url || (embeddable.url_fragment ? url + embeddable.url_fragment : url)
  );
```

Locate lines 223 and 226:

```typescript
  const { authored_state } = embeddable;
  ...
  const authoredState = useMemo(() => safeJsonParseIfString(authored_state) || {}, [authored_state]);
```

Inject the override between them. The override is applied to the raw string form (before `safeJsonParseIfString`), since `applyOverridesToAuthoredState` operates on the JSON-encoded string. Replace those two lines with:

```typescript
  const { authored_state } = embeddable;
  const overriddenAuthoredState = typeof authored_state === "string"
    ? applyOverridesToAuthoredState(authored_state)
    : authored_state;
  const authoredState = useMemo(
    () => safeJsonParseIfString(overriddenAuthoredState) || {},
    [overriddenAuthoredState]
  );
```

Verify that no other site in the file uses `authored_state` directly — line 369 already references the local `authoredState` (post-parse), which is correct. No further changes needed.

- [ ] **Step 3: Apply overrides at iframe-runtime**

In `iframe-runtime.tsx`, add the import:

```typescript
import { applyOverrides } from "../../../utilities/url-overrides/state";
```

Replace the line at ~519:

```typescript
        src={url}
```

with:

```typescript
        src={applyOverrides(url)}
```

- [ ] **Step 4: Apply overrides at lightbox**

In `lightbox.tsx`, add the import:

```typescript
import { applyOverrides } from "../../../utilities/url-overrides/state";
```

Replace the lightbox iframe `src` at ~90:

```typescript
        <iframe src={url} width={iframeSizeOpts.width} height={iframeSizeOpts.height} title="Image lightbox" data-testid="lightbox-iframe" />
```

with:

```typescript
        <iframe src={applyOverrides(url)} width={iframeSizeOpts.width} height={iframeSizeOpts.height} title="Image lightbox" data-testid="lightbox-iframe" />
```

- [ ] **Step 5: Add an integration test at the managed-interactive site**

Add a new test case in `src/components/activity-page/managed-interactive/managed-interactive.test.tsx` (or a new file `managed-interactive-overrides.test.tsx` if the existing one is large):

```typescript
import {
  initializeOverrides,
  resetOverridesForTesting,
} from "../../../utilities/url-overrides/state";

describe("managed-interactive URL overrides", () => {
  beforeEach(() => resetOverridesForTesting());

  it("rewrites the iframe URL when an override is active", async () => {
    await initializeOverrides({
      fetchRegistry: async () => ({
        qi: {
          prefix: "https://models-resources.concord.org/question-interactives/",
          match: "(branch|version)/[^/]+/",
          replace: "branch/${value}/",
        },
      }),
      getSearch: () => "?override.qi=my-branch",
    });

    // Render ManagedInteractive with an embeddable whose URL goes through question-interactives.
    // The exact render setup depends on the existing test scaffolding in this file —
    // look at the existing passing tests in managed-interactive.test.tsx and follow the same setup.

    // Assert the rendered iframe's src contains "/branch/my-branch/".
  });
});
```

If the existing test file uses a mocking or shallow-render approach that doesn't easily reach the iframe `src`, instead add a unit test that calls `applyOverrides` directly with the expected post-fragment URL and assert the rewrite.

- [ ] **Step 6: Run the full test suite**

Run: `npm test -- --watchAll=false`
Expected: PASS.

- [ ] **Step 7: Manual verification**

```bash
npm start
```

Open the dev server in a browser. Load a sample activity URL that includes a question-interactives URL, with `?override.qi=master` appended. Verify:
- The banner appears at the top showing the active override.
- The interactive iframe loads from `branch/master/` (visible in DevTools → Network tab).
- Removing the override param reverts to the original URL.

- [ ] **Step 8: Commit**

```bash
git add src/components/activity-page/managed-interactive/
git commit -m "feat(AP-115): apply URL overrides at all three iframe sites"
```

---

## Done

After Task 8 the feature is complete on this branch. Steps before merging:

1. Stand up the `runtime-config` repo (separate work item — out of scope here).
2. Verify the registry file exists at `https://models-resources.concord.org/runtime-config/interactive-override-registry.json` with the initial `qi`, `mr`, and `wildfire` entries.
3. Run `npm run build` and confirm no type or lint errors.
4. Open a PR against `master` referencing AP-115.
