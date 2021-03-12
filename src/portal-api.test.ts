import { firebaseAppName, clearFirebaseAppName, getToolId } from "./portal-api";

describe("firebaseAppName", () => {

  beforeEach(() => {
    clearFirebaseAppName();
  });

  describe("with different urls", () => {
    const oldWindowLocation = window.location;
    const url = document.createElement("a");

    beforeEach(() => {
      // Need to mock window location
      // The properties of `a` elements match the origin, hostname, pathname props of window.location
      // so that is a hacky way to mock the window location

      // @ts-expect-error: mocking window location
      delete window.location;
      // @ts-expect-error: mocking window location
      window.location = url;
    });

    afterEach(() => {
      // restore `window.location` to the `jsdom` `Location` object
      window.location = oldWindowLocation;
    });

    it("returns report-service-pro when the url is https://activity-player.concord.org", () => {
      url.href = "https://activity-player.concord.org";
      expect(firebaseAppName()).toBe("report-service-pro");
    });

    it("returns report-service-dev on a branch url", () => {
      url.href = "https://activity-player.concord.org/branch/foo";
      expect(firebaseAppName()).toBe("report-service-dev");
    });

    it("returns report-service-dev on localhost url", () => {
      url.href = "http://localhost:11000";
      expect(firebaseAppName()).toBe("report-service-dev");
    });

    it("can be overridden to report-service-pro with a branch url", () => {
      url.href = "https://activity-player.concord.org/branch/foo?firebaseApp=report-service-pro";
      expect(firebaseAppName()).toBe("report-service-pro");
    });

  });

});

describe("getToolId", () => {
  const { location } = window;
  it("returns an id which is a combination of the host and path", () => {
    delete (window as any).location;

    const mockLocation = {host: "", pathname: ""};
    (window as any).location = mockLocation;

    mockLocation.host = "www.example.com";
    mockLocation.pathname = "/foo";
    expect(getToolId()).toBe("www.example.com/foo");

    mockLocation.host = "www.example.com:8080";
    mockLocation.pathname = "/bar";
    expect(getToolId()).toBe("www.example.com:8080/bar");

    (window as any).location = location;
  });
});