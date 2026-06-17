/**
 * Exercises the URL override pipeline (registry → parse → compile → apply) end-to-end
 * via initializeOverrides + applyOverrides, keeping the assertions fast and dependency-free.
 * (The heavy component-render tests live in managed-interactive.test.tsx.)
 */
import {
  initializeOverrides,
  resetOverridesForTesting,
  applyOverrides,
} from "../../../utilities/url-overrides/state";
import { RegistryJson } from "../../../utilities/url-overrides/types";

const registry: RegistryJson = {
  qi: {
    prefix: "https://models-resources.concord.org/question-interactives/",
    match: "(branch|version)/[^/]+/",
    replace: "branch/${value}/",
  },
};

describe("iframe URL override integration (AP-115)", () => {
  beforeEach(() => resetOverridesForTesting());

  it("applyOverrides rewrites a question-interactives URL after initialization", async () => {
    await initializeOverrides({
      fetchRegistry: async () => registry,
      getSearch: () => "?override.qi=my-branch",
    });

    const input = "https://models-resources.concord.org/question-interactives/branch/master/multiple-choice/";
    const result = applyOverrides(input);
    expect(result).toBe(
      "https://models-resources.concord.org/question-interactives/branch/my-branch/multiple-choice/"
    );
  });

  it("applyOverrides is a no-op when no overrides are active", async () => {
    await initializeOverrides({
      fetchRegistry: async () => registry,
      getSearch: () => "",
    });

    const input = "https://models-resources.concord.org/question-interactives/branch/master/multiple-choice/";
    expect(applyOverrides(input)).toBe(input);
  });

  it("applyOverrides leaves non-matching URLs unchanged", async () => {
    await initializeOverrides({
      fetchRegistry: async () => registry,
      getSearch: () => "?override.qi=my-branch",
    });

    const unrelatedUrl = "https://example.com/some-other-interactive/";
    expect(applyOverrides(unrelatedUrl)).toBe(unrelatedUrl);
  });
});
