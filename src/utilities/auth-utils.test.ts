import { getBearerToken, initializeAuthorization } from "./auth-utils";
import queryString from "query-string";

describe("initializeAuthorization", () => {
  const oldWindowLocation = window.location;

  function getWindowHref() {
    const calls = (window.location as any).assign.mock.calls;
    return calls[calls.length - 1][0];
  }

  beforeAll(() => {
    // This approach is based on this blog post:
    // https://www.benmvp.com/blog/mocking-window-location-methods-jest-jsdom/
    // I added the href set override to catch any code that might be calling
    // `window.location.href=``
    delete (window as any).location;

    const oldPropertyDescriptors = Object.getOwnPropertyDescriptors(oldWindowLocation);
    (window as any).location = Object.defineProperties(
      {},
      {
        ...oldPropertyDescriptors,
        assign: {
          configurable: true,
          value: jest.fn(),
        },
        href: {
          ...oldPropertyDescriptors.href,
          set: (value) => {throw new Error("must use window.location.assign instead of window.location.href="); }
        }
      }
    );
  });

  beforeEach(() => {
    (window.location as any).assign.mockReset();
  });

  afterAll(() => {
    // restore `window.location` to the `jsdom` `Location` object
    window.location = oldWindowLocation;
  });

  describe("when there is no access_token param", () => {
    describe("and an auth-domain param", () => {
      beforeEach(() => {
        window.history.replaceState({}, "Test", "/?auth-domain=https://portal.concord.org&extraParam=extraValue");
      });

      it("redirects to portal to authenticate", () => {
        initializeAuthorization();
        expect(window.location.assign).toHaveBeenCalledTimes(1);
        const redirectURL = getWindowHref();
        const urlParts = queryString.parseUrl(redirectURL);
        expect(urlParts.url).toEqual("https://portal.concord.org/auth/oauth_authorize");
        expect(urlParts.query).toMatchObject({
          client_id: "activity-player",
          redirect_uri: "https://activity-player.unexisting.url.com/",
          response_type: "token"
        });
      });

      it("saves all query params in session storage under state key", () => {
        initializeAuthorization();
        expect(window.location.assign).toHaveBeenCalledTimes(1);
        const redirectURL = getWindowHref();
        const urlParts = queryString.parseUrl(redirectURL);
        const state = urlParts.query.state;
        const savedParams = sessionStorage.getItem(typeof state !== "string" ? "" : state);
        expect(savedParams).toEqual("?auth-domain=https://portal.concord.org&extraParam=extraValue");
      });
    });

    describe("and no auth-domain param", () => {
      beforeEach(() => {
        window.history.replaceState({}, "Test", "/");
      });

      it("does not redirect", () => {
        console.log("das", window.location.href, initializeAuthorization());
        expect(window.location.assign).toHaveBeenCalledTimes(0);
      });
    });
  });

  describe("when there is an access_token and state param", () => {
    beforeEach(() => {
      window.history.replaceState({}, "Test", "/#access_token=1234567&state=abcdefg");
    });

    it("saves the accessToken that can be obtained using getBearerToken helper", () => {
      expect(getBearerToken()).toEqual(null);
      initializeAuthorization();
      expect(getBearerToken()).toEqual("1234567");
    });

    it("load parameters from session storage, and updates the url", () => {
      sessionStorage.setItem("abcdefg", "?auth-domain=https://portal.concord.org&extraParam=extraValue");
      initializeAuthorization();
      expect(window.location.href).toEqual("https://activity-player.unexisting.url.com/?auth-domain=https://portal.concord.org&extraParam=extraValue");
    });

    it("does not redirect", () => {
      initializeAuthorization();
      expect(window.location.assign).toHaveBeenCalledTimes(0);
    });
  });
});

describe("getBearerToken", () => {
  it("returns value of token URL param when it's available", () => {
    window.history.replaceState({}, "Test", "/?token=12345");
    expect(getBearerToken()).toEqual("12345");
  });
});
