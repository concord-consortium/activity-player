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
