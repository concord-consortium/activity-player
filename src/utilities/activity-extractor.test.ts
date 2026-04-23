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
});
