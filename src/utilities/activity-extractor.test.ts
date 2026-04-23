import { extractActivityParams } from "./activity-extractor";

describe("extractActivityParams", () => {
  it("returns null for empty or whitespace-only input", () => {
    expect(extractActivityParams("")).toBeNull();
    expect(extractActivityParams("   ")).toBeNull();
    expect(extractActivityParams("\n\t ")).toBeNull();
  });

  it("treats a non-URL string as a sample activity key", () => {
    expect(extractActivityParams("sample-activity-1")).toEqual({ activity: "sample-activity-1" });
  });

  it("trims surrounding whitespace before interpreting the input", () => {
    expect(extractActivityParams("  sample-activity-1  ")).toEqual({ activity: "sample-activity-1" });
  });

  it("extracts an `activity` query param from a pasted Activity Player URL", () => {
    const pasted = "https://activity-player.concord.org/branch/master/index.html" +
      "?activity=https://authoring.staging.concord.org/api/v1/123.json";
    expect(extractActivityParams(pasted)).toEqual({
      activity: "https://authoring.staging.concord.org/api/v1/123.json"
    });
  });

  it("extracts a `sequence` query param from a pasted Activity Player URL", () => {
    const pasted = "https://activity-player.concord.org/?sequence=https://example.com/seq.json";
    expect(extractActivityParams(pasted)).toEqual({
      sequence: "https://example.com/seq.json"
    });
  });

  it("forwards `sequenceActivity` and `page` alongside `sequence`", () => {
    const pasted = "https://activity-player.concord.org/?sequence=https://x/s.json" +
      "&sequenceActivity=2&page=3";
    expect(extractActivityParams(pasted)).toEqual({
      sequence: "https://x/s.json",
      sequenceActivity: "2",
      page: "3"
    });
  });

  it("ignores unrelated query params on a pasted Activity Player URL", () => {
    const pasted = "https://activity-player.concord.org/?activity=https://x/a.json" +
      "&preview=true&firebaseApp=report-service-dev";
    expect(extractActivityParams(pasted)).toEqual({
      activity: "https://x/a.json"
    });
  });

  it("treats a direct authoring JSON endpoint URL as the activity", () => {
    const pasted = "https://authoring.staging.concord.org/api/v1/123.json";
    expect(extractActivityParams(pasted)).toEqual({ activity: pasted });
  });

  it("treats any non-AP URL as the activity URL itself", () => {
    const pasted = "https://example.com/some-activity.json";
    expect(extractActivityParams(pasted)).toEqual({ activity: pasted });
  });

  it("handles a real-world AP URL with a percent-encoded authoring.concord.org activity value", () => {
    const pasted = "https://activity-player.concord.org/" +
      "?activity=https%3A%2F%2Fauthoring.concord.org%2Fapi%2Fv1%2Factivities%2F14237.json&preview";
    expect(extractActivityParams(pasted)).toEqual({
      activity: "https://authoring.concord.org/api/v1/activities/14237.json"
    });
  });

  describe("authoring UI URLs", () => {
    it("converts an authoring activity edit URL to the JSON API endpoint", () => {
      expect(extractActivityParams("https://authoring.concord.org/activities/14237/edit")).toEqual({
        activity: "https://authoring.concord.org/api/v1/activities/14237.json"
      });
    });

    it("converts an authoring activity view URL (no /edit) to the JSON API endpoint", () => {
      expect(extractActivityParams("https://authoring.concord.org/activities/14237")).toEqual({
        activity: "https://authoring.concord.org/api/v1/activities/14237.json"
      });
    });

    it("preserves the staging origin", () => {
      expect(extractActivityParams("https://authoring.staging.concord.org/activities/99/edit")).toEqual({
        activity: "https://authoring.staging.concord.org/api/v1/activities/99.json"
      });
    });

    it("converts an authoring sequence URL into the `sequence` param", () => {
      expect(extractActivityParams("https://authoring.concord.org/sequences/42/edit")).toEqual({
        sequence: "https://authoring.concord.org/api/v1/sequences/42.json"
      });
    });

    it("falls back to treating the URL as an activity when the path doesn't match (e.g. /activities/new)", () => {
      const url = "https://authoring.concord.org/activities/new";
      expect(extractActivityParams(url)).toEqual({ activity: url });
    });

    it("does not transform non-authoring hostnames that happen to have /activities/ in the path", () => {
      const url = "https://example.com/activities/123/edit";
      expect(extractActivityParams(url)).toEqual({ activity: url });
    });
  });
});
