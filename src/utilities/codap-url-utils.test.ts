import { convertCodapUrl } from "./codap-url-utils";

describe("convertCodapUrl", () => {
  const v3 = "https://codap3.concord.org";

  it("rewrites a direct CODAP V2 URL to use the V3 base, preserving query params verbatim", () => {
    const v2 = "https://codap.concord.org/app/static/dg/en/cert/index.html?interactiveApi&documentId=X";
    expect(convertCodapUrl(v2, v3)).toBe("https://codap3.concord.org?interactiveApi&documentId=X");
  });

  it("preserves the V2 hash", () => {
    const v2 = "https://codap.concord.org/foo?bar=1#frag";
    expect(convertCodapUrl(v2, v3)).toBe("https://codap3.concord.org?bar=1#frag");
  });

  it("handles a CODAP V2 URL with no query and no hash", () => {
    expect(convertCodapUrl("https://codap.concord.org/app/", v3)).toBe("https://codap3.concord.org");
  });

  it("merges into a V3 base that already has query params", () => {
    const v2 = "https://codap.concord.org/?interactiveApi";
    expect(convertCodapUrl(v2, "https://codap3.concord.org/?debug=1"))
      .toBe("https://codap3.concord.org/?debug=1&interactiveApi");
  });

  it("keeps a V3 base hash when the V2 URL has no hash", () => {
    expect(convertCodapUrl("https://codap.concord.org/?foo=1", "https://codap3.concord.org/#home"))
      .toBe("https://codap3.concord.org/?foo=1#home");
  });

  it("prefers the V2 hash over a V3 base hash", () => {
    expect(convertCodapUrl("https://codap.concord.org/#v2hash", "https://codap3.concord.org/#v3hash"))
      .toBe("https://codap3.concord.org/#v2hash");
  });

  it("passes through non-CODAP URLs unchanged", () => {
    expect(convertCodapUrl("https://example.com/foo?bar=1", v3)).toBe("https://example.com/foo?bar=1");
  });

  it("does not touch SageModeler URLs that happen to use a 'codap' query parameter", () => {
    const sm = "https://sagemodeler.concord.org/branch/master/app/?codap=staging";
    expect(convertCodapUrl(sm, v3)).toBe(sm);
  });

  it("rewrites a CODAP V2 URL wrapped in a full-screen question interactive", () => {
    const wrapped = "https://codap.concord.org/app/static/dg/en/cert/index.html?interactiveApi&documentId=X";
    const outer = `https://models-resources.concord.org/question-interactives/full-screen/?wrappedInteractive=${encodeURIComponent(wrapped)}`;
    const converted = convertCodapUrl(outer, v3);
    const url = new URL(converted);
    expect(url.origin + url.pathname).toBe("https://models-resources.concord.org/question-interactives/full-screen/");
    expect(url.searchParams.get("wrappedInteractive")).toBe("https://codap3.concord.org?interactiveApi&documentId=X");
  });

  it("preserves a doubly-encoded inner value inside wrappedInteractive", () => {
    // V2 URL whose documentId is itself a URL-encoded URL. After conversion, the
    // documentId bytes should be preserved verbatim in the inner URL.
    const innerDoc = "https%3A%2F%2Fcfm-shared.concord.org%2FTIB2fm6urfelkV2ydJBr%2Ffile.json";
    const wrapped = `https://codap.concord.org/app/static/dg/en/cert/index.html?interactiveApi&documentId=${innerDoc}`;
    const outer = `https://models-resources.concord.org/question-interactives/full-screen/?wrappedInteractive=${encodeURIComponent(wrapped)}`;
    const converted = convertCodapUrl(outer, v3);
    const innerAfter = new URL(converted).searchParams.get("wrappedInteractive");
    expect(innerAfter).toBe(`https://codap3.concord.org?interactiveApi&documentId=${innerDoc}`);
  });

  it("passes through a wrapper whose wrappedInteractive is not a CODAP URL", () => {
    const other = "https://example.com/foo";
    const outer = `https://models-resources.concord.org/question-interactives/full-screen/?wrappedInteractive=${encodeURIComponent(other)}`;
    expect(convertCodapUrl(outer, v3)).toBe(outer);
  });

  it("also rewrites existing codap3.concord.org URLs so stale V3 references are redirected", () => {
    const staleV3 = "https://codap3.concord.org/?url=https%3A%2F%2Fexample.com%2Fdoc.json";
    expect(convertCodapUrl(staleV3, "https://codap3.concord.org/branch/feature-x/"))
      .toBe("https://codap3.concord.org/branch/feature-x/?url=https%3A%2F%2Fexample.com%2Fdoc.json");
  });

  it("returns the input unchanged for non-URL strings", () => {
    expect(convertCodapUrl("not a url", v3)).toBe("not a url");
    expect(convertCodapUrl("", v3)).toBe("");
  });

  it("passes through unchanged when the base URL is not http(s) (XSS defense)", () => {
    const v2 = "https://codap.concord.org/app/?foo=bar";
    expect(convertCodapUrl(v2, "javascript:alert(1)")).toBe(v2);
    expect(convertCodapUrl(v2, "data:text/html,<script>alert(1)</script>")).toBe(v2);
    expect(convertCodapUrl(v2, "file:///etc/passwd")).toBe(v2);
    expect(convertCodapUrl(v2, "not a url")).toBe(v2);
    expect(convertCodapUrl(v2, "")).toBe(v2);
  });
});
