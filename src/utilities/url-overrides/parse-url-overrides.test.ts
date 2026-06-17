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
