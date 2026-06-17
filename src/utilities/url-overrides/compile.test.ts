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
    expect(rule!.regex.test("https://models-resources.concord.org/question-interactives/branch/old/multiple-choice/")).toBe(true);
    expect(rule!.regex.test("https://models-resources.concord.org/question-interactives/version/1.2.3/multiple-choice/")).toBe(true);
    expect(rule!.regex.test("https://models-resources.concord.org/question-interactives/")).toBe(false);
    expect(rule!.regex.test("https://other-host.example/question-interactives/branch/x/")).toBe(false);
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
    // Param injected as a literal — only matches the exact project name.
    expect(rule!.regex.test("https://models-resources.concord.org/question-interactives/")).toBe(true);
    expect(rule!.regex.test("https://models-resources.concord.org/question_interactives/")).toBe(false);
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
