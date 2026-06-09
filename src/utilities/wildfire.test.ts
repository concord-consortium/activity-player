import { rewriteWildfireUrls } from "./wildfire";

describe("rewriteWildfireUrls", () => {
  it("inserts a branch segment into bare wildfire URLs", () => {
    const resource = { url: "https://wildfire.concord.org/index.html?preset=plainsTwoZone" };
    expect(rewriteWildfireUrls(resource, "my-branch")).toEqual({
      url: "https://wildfire.concord.org/branch/my-branch/index.html?preset=plainsTwoZone"
    });
  });

  it("replaces an existing branch segment", () => {
    const resource = { url: "https://wildfire.concord.org/branch/master/index.html" };
    expect(rewriteWildfireUrls(resource, "my-branch")).toEqual({
      url: "https://wildfire.concord.org/branch/my-branch/index.html"
    });
  });

  it("rewrites URLs nested anywhere in the resource", () => {
    const resource = {
      pages: [
        { embeddables: [{ type: "MwInteractive", url: "https://wildfire.concord.org/foo.html" }] },
        { embeddables: [{ library_interactive: { data: { base_url: "https://wildfire.concord.org/branch/old/" } } }] }
      ]
    };
    const rewritten = rewriteWildfireUrls(resource, "feature-x") as any;
    expect(rewritten.pages[0].embeddables[0].url).toBe("https://wildfire.concord.org/branch/feature-x/foo.html");
    expect(rewritten.pages[1].embeddables[0].library_interactive.data.base_url)
      .toBe("https://wildfire.concord.org/branch/feature-x/");
  });

  it("leaves non-wildfire URLs untouched", () => {
    const resource = { url: "https://models-resources.concord.org/index.html" };
    expect(rewriteWildfireUrls(resource, "my-branch")).toEqual(resource);
  });

  it("handles null/undefined resources", () => {
    expect(rewriteWildfireUrls(null, "my-branch")).toBeNull();
    expect(rewriteWildfireUrls(undefined, "my-branch")).toBeUndefined();
  });
});
