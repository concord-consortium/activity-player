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

  it("forwards all query params on a pasted Activity Player URL", () => {
    const pasted = "https://activity-player.concord.org/?activity=https://x/a.json" +
      "&preview=true&firebaseApp=report-service-dev";
    expect(extractActivityParams(pasted)).toEqual({
      activity: "https://x/a.json",
      preview: "true",
      firebaseApp: "report-service-dev"
    });
  });

  it("forwards a student's full launch URL (domain, domain_uid, token) so the run loads as that student", () => {
    const pasted = "https://activity-player.concord.org/?domain=https%3A%2F%2Flearn.concord.org%2F" +
      "&domain_uid=77701&sequence=https%3A%2F%2Fauthoring.concord.org%2Fapi%2Fv1%2Fsequences%2F429.json" +
      "&sequenceActivity=0&token=abc.def.ghi";
    expect(extractActivityParams(pasted)).toEqual({
      domain: "https://learn.concord.org/",
      domain_uid: "77701",
      sequence: "https://authoring.concord.org/api/v1/sequences/429.json",
      sequenceActivity: "0",
      token: "abc.def.ghi",
      // production-portal run → defaulted so it loads off-production too
      firebaseApp: "report-service-pro"
    });
  });

  it("defaults firebaseApp to report-service-pro for a production-portal launch URL", () => {
    const pasted = "https://activity-player.concord.org/?domain=https%3A%2F%2Flearn.concord.org%2F" +
      "&sequence=https://x/s.json&token=abc.def.ghi";
    expect(extractActivityParams(pasted)).toEqual({
      domain: "https://learn.concord.org/",
      sequence: "https://x/s.json",
      token: "abc.def.ghi",
      firebaseApp: "report-service-pro"
    });
  });

  it("does not override an explicit firebaseApp on a production-portal launch URL", () => {
    const pasted = "https://activity-player.concord.org/?domain=https%3A%2F%2Flearn.concord.org%2F" +
      "&sequence=https://x/s.json&firebaseApp=report-service-dev";
    expect(extractActivityParams(pasted)).toMatchObject({ firebaseApp: "report-service-dev" });
  });

  it("does not add firebaseApp for a non-production (e.g. staging) portal domain", () => {
    const pasted = "https://activity-player.concord.org/?domain=https%3A%2F%2Flearn.staging.concord.org%2F" +
      "&sequence=https://x/s.json&token=abc.def.ghi";
    expect(extractActivityParams(pasted)).not.toHaveProperty("firebaseApp");
  });

  it("does not add firebaseApp when no domain is present", () => {
    const pasted = "https://activity-player.concord.org/?sequence=https://x/s.json";
    expect(extractActivityParams(pasted)).not.toHaveProperty("firebaseApp");
  });

  it("drops noDefaultActivity when forwarding an AP launch URL so the dialog isn't reshown", () => {
    const pasted = "https://activity-player.concord.org/?noDefaultActivity&activity=https://x/a.json";
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
      activity: "https://authoring.concord.org/api/v1/activities/14237.json",
      preview: ""
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
