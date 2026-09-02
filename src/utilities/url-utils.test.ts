import { isAllowedPluginScriptUrl, isHttpUrl } from "./url-utils";

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

  it("accepts scheme-relative urls, which the browser loads using the page's own scheme", () => {
    expect(isHttpUrl("//models-resources.concord.org/interactive/index.html")).toBe(true);
    // the URL parser ignores leading whitespace, so a padded url loads the same way
    expect(isHttpUrl(" //models-resources.concord.org/interactive/index.html")).toBe(true);
  });

  it("rejects empty, missing, or relative values", () => {
    expect(isHttpUrl(undefined)).toBe(false);
    expect(isHttpUrl("")).toBe(false);
    expect(isHttpUrl("/relative/path")).toBe(false);
    expect(isHttpUrl("example.com/no-scheme")).toBe(false);
  });
});

describe("isAllowedPluginScriptUrl", () => {
  it("accepts the plugin script urls approved in production and staging", () => {
    const approvedScriptUrls = [
      "https://model-feedback.concord.org/version/1.1.2/trap.js",
      "https://model-feedback.concord.org/version/1.1.2/aquifer.js",
      "https://model-feedback.concord.org/version/1.1.2/supply.js",
      "https://model-feedback.concord.org/version/1.1.2/feedbackView.js",
      "https://model-feedback.concord.org/version/1.1.2/debugging.js",
      "https://models-resources.concord.org/glossary-plugin/version/v4.6.0/plugin.js",
      "https://models-resources.concord.org/glossary-plugin/version/v4.1.0/plugin.js",
      "https://models-resources.concord.org/glossary-plugin/plugin.js",
      "https://teacher-edition-tips-plugin.concord.org/version/v3.10.0/plugin.js",
      "https://lara-sharing-plugin.concord.org/version/v5.0.3/plugin.js",
      "https://lara-sharing-plugin.concord.org/version/v5.0.2/plugin.js",
      "https://lara-sharing-plugin.concord.org/branch/master/plugin.js",
      "https://glossary-plugin.concord.org/version/v3.13.0-pre.4/plugin.js",
      "https://glossary-plugin.concord.org/branch/master/plugin.js",
    ];
    approvedScriptUrls.forEach((url) => expect(isAllowedPluginScriptUrl(url)).toBe(true));
  });

  it("accepts concord.org itself and any subdomain", () => {
    expect(isAllowedPluginScriptUrl("https://concord.org/plugin.js")).toBe(true);
    expect(isAllowedPluginScriptUrl("https://a.b.concord.org/plugin.js")).toBe(true);
  });

  it("handles scheme-relative urls, allowing only allowed hosts", () => {
    expect(isAllowedPluginScriptUrl("//models-resources.concord.org/glossary-plugin/plugin.js")).toBe(true);
    expect(isAllowedPluginScriptUrl("//evil.example.com/plugin.js")).toBe(false);
  });

  it("accepts locally served scripts on any port", () => {
    expect(isAllowedPluginScriptUrl("http://localhost:8080/plugin.js")).toBe(true);
    expect(isAllowedPluginScriptUrl("http://127.0.0.1:11000/plugin.js")).toBe(true);
  });

  it("rejects hosts that merely look like an allowed host", () => {
    expect(isAllowedPluginScriptUrl("https://evilconcord.org/plugin.js")).toBe(false);
    expect(isAllowedPluginScriptUrl("https://concord.org.example.com/plugin.js")).toBe(false);
    expect(isAllowedPluginScriptUrl("https://example.com/concord.org/plugin.js")).toBe(false);
    expect(isAllowedPluginScriptUrl("https://notlocalhost/plugin.js")).toBe(false);
    expect(isAllowedPluginScriptUrl("https://evil.127.0.0.1.example.com/plugin.js")).toBe(false);
  });

  it("rejects allowed hosts reached with an unsupported scheme", () => {
    expect(isAllowedPluginScriptUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedPluginScriptUrl("data:text/javascript,alert(1)")).toBe(false);
    expect(isAllowedPluginScriptUrl("ftp://models-resources.concord.org/plugin.js")).toBe(false);
  });

  it("rejects empty, missing, or relative values", () => {
    expect(isAllowedPluginScriptUrl(undefined)).toBe(false);
    expect(isAllowedPluginScriptUrl("")).toBe(false);
    expect(isAllowedPluginScriptUrl("/relative/plugin.js")).toBe(false);
  });
});
