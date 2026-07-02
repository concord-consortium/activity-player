import { isHttpUrl } from "./url-utils";

describe("isHttpUrl", () => {
  it("accepts absolute http and https urls", () => {
    expect(isHttpUrl("http://example.com/foo")).toBe(true);
    expect(isHttpUrl("https://example.com/foo?bar=1")).toBe(true);
  });

  it("rejects urls that use an unsupported scheme", () => {
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,<h1>hi</h1>")).toBe(false);
    expect(isHttpUrl("ftp://example.com/file")).toBe(false);
  });

  it("rejects empty, missing, or relative values", () => {
    expect(isHttpUrl(undefined)).toBe(false);
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl("/relative/path")).toBe(false);
    expect(isHttpUrl("example.com/no-scheme")).toBe(false);
  });
});
