import { deleteQueryValue, setQueryValue, hashValue } from "./url-query";

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

  describe("hashValue", () => {
    it("returns value of a hash param", () => {
      url.href = "https://example.com?foo=bar#baz=bam";
      expect(hashValue("foo")).toEqual(undefined);
      expect(hashValue("baz")).toEqual("bam");
    });
  });
});
