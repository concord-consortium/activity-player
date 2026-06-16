import { applyQiBranchOverride } from "./qi-branch-override";

const setSearch = (search: string) => {
  Object.defineProperty(window, "location", {
    value: { ...window.location, search },
    writable: true,
  });
};

describe("applyQiBranchOverride", () => {
  afterEach(() => setSearch(""));

  it("returns the URL unchanged when qiBranch is not set", () => {
    setSearch("");
    const url = "https://models-resources.concord.org/question-interactives/branch/master/drawing-tool/";
    expect(applyQiBranchOverride(url)).toBe(url);
  });

  it("rewrites a branch URL to the qiBranch value", () => {
    setSearch("?qiBranch=AP-110");
    expect(
      applyQiBranchOverride("https://models-resources.concord.org/question-interactives/branch/master/drawing-tool/")
    ).toBe(
      "https://models-resources.concord.org/question-interactives/branch/AP-110/drawing-tool/"
    );
  });

  it("rewrites a version-pinned URL to the qiBranch value", () => {
    setSearch("?qiBranch=AP-110");
    expect(
      applyQiBranchOverride("https://models-resources.concord.org/question-interactives/version/v1.2.3/drawing-tool/")
    ).toBe(
      "https://models-resources.concord.org/question-interactives/branch/AP-110/drawing-tool/"
    );
  });

  it("preserves the path tail after the swapped segment", () => {
    setSearch("?qiBranch=AP-110");
    expect(
      applyQiBranchOverride("https://models-resources.concord.org/question-interactives/branch/master/drawing-tool/wrapper.html?foo=bar")
    ).toBe(
      "https://models-resources.concord.org/question-interactives/branch/AP-110/drawing-tool/wrapper.html?foo=bar"
    );
  });

  it("leaves URLs from other hosts unchanged", () => {
    setSearch("?qiBranch=AP-110");
    const url = "https://example.com/some-interactive/branch/master/widget/";
    expect(applyQiBranchOverride(url)).toBe(url);
  });
});
