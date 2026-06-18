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
