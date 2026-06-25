import { deleteQueryValue, setQueryValue, hashValue, getPageHref } from "./url-query";

describe("query string functions", () => {
  const oldWindowLocation = window.location;
  const oldWindowHistory = window.history;
  const url = document.createElement("a");

  beforeEach(() => {
    // @ts-expect-error: mocking window location
    delete window.location;
    // @ts-expect-error: mocking window location
    window.location = url;

    // @ts-expect-error: mocking window history
    delete window.history;
    // @ts-expect-error: mocking window history
    window.history = {
      replaceState: jest.fn()
    };
  });

  afterEach(() => {
    window.location = oldWindowLocation;
    window.history = oldWindowHistory;
    jest.resetAllMocks();
  });

  describe("setQueryValue", () => {
    it("works without the optional reload parameter", () => {
      url.href = "https://example.com";
      setQueryValue("foo", "bar");
      expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "?foo=bar");
    });

    it("works with the optional reload parameter", () => {
      url.href = "https://example.com";
      setQueryValue("foo", "bar", true);
      expect(window.history.replaceState).not.toHaveBeenCalled();
      expect(window.location.search).toBe("?foo=bar");
    });
  });

  describe("deleteQueryValue", () => {
    it("works without the optional reload parameter", () => {
      url.href = "https://example.com?foo=bar&baz=bam";
      deleteQueryValue("foo");
      expect(window.history.replaceState).toHaveBeenCalledWith(null, "", "?baz=bam");
    });

    it("works with the optional reload parameter", () => {
      url.href = "https://example.com?foo=bar&baz=bam";
      deleteQueryValue("foo", true);
      expect(window.history.replaceState).not.toHaveBeenCalled();
      expect(window.location.search).toBe("?baz=bam");
    });
  });

  describe("getPageHref", () => {
    it("sets the page param to page_<id>, preserving other params", () => {
      url.href = "https://example.com?activity=foo&page=page_99";
      expect(getPageHref(123)).toBe("?activity=foo&page=page_123");
    });

    it("removes the page param for the home page (null id)", () => {
      url.href = "https://example.com?activity=foo&page=page_99";
      expect(getPageHref(null)).toBe("?activity=foo");
    });

    it("does not mutate history", () => {
      url.href = "https://example.com?activity=foo";
      getPageHref(5);
      expect(window.history.replaceState).not.toHaveBeenCalled();
    });
  });

  describe("hashValue", () => {
    it("returns value of a hash param", () => {
      url.href = "https://example.com?foo=bar#baz=bam";
      expect(hashValue("foo")).toEqual(undefined);
      expect(hashValue("baz")).toEqual("bam");
    });
  });
});
