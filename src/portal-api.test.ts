import jwt from "jsonwebtoken";
import superagent from "superagent";
import { firebaseAppName, clearFirebaseAppName, refreshPortalJWT, refreshActivityPlayerFirebaseJWT } from "./portal-api";

const mockRequest: Record<string, jest.Mock> = {
  set: jest.fn(() => mockRequest),
  query: jest.fn(() => mockRequest),
  timeout: jest.fn(() => mockRequest),
  end: jest.fn()
};
jest.mock("superagent", () => ({ get: jest.fn(() => mockRequest) }));

beforeEach(() => jest.clearAllMocks());

describe("refreshPortalJWT", () => {
  it("re-mints with the current portal JWT, a Bearer/JWT header and a timeout", async () => {
    const token = jwt.sign({ uid: 7 }, "secret");
    mockRequest.end.mockImplementation((cb: any) => cb(null, { body: { token } }));
    const [raw, decoded] = await refreshPortalJWT("https://portal", "abc");
    expect(superagent.get).toHaveBeenCalledWith("https://portal/api/v1/jwt/portal");
    expect(mockRequest.set).toHaveBeenCalledWith("Authorization", "Bearer/JWT abc");
    expect(mockRequest.timeout).toHaveBeenCalledWith(10000);
    expect(raw).toBe(token);
    expect(decoded.uid).toBe(7);
  });
});

describe("refreshActivityPlayerFirebaseJWT", () => {
  it("mints the report-service Firebase JWT for the class with the current portal JWT and a timeout", async () => {
    const token = jwt.sign({ claims: { user_type: "learner" } }, "secret");
    mockRequest.end.mockImplementation((cb: any) => cb(null, { body: { token } }));
    const [raw] = await refreshActivityPlayerFirebaseJWT("https://portal/", "abc", "class-hash");
    expect(superagent.get).toHaveBeenCalledWith("https://portal/api/v1/jwt/firebase");
    expect(mockRequest.query).toHaveBeenCalledWith({ firebase_app: firebaseAppName(), class_hash: "class-hash" });
    expect(mockRequest.set).toHaveBeenCalledWith("Authorization", "Bearer/JWT abc");
    expect(mockRequest.timeout).toHaveBeenCalledWith(10000);
    expect(raw).toBe(token);
  });
});

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
      url.href = "http://localhost:8080";
      expect(firebaseAppName()).toBe("report-service-dev");
    });

    it("can be overridden to report-service-pro with a branch url", () => {
      url.href = "https://activity-player.concord.org/branch/foo?firebaseApp=report-service-pro";
      expect(firebaseAppName()).toBe("report-service-pro");
    });

  });

});
