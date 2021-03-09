import { getReportUrl, portalReportBaseUrl,
         kProductionPortalReportUrl, kDevPortalReportUrl} from "./report-utils";
import { clearFirebaseAppName } from "../portal-api";

jest.mock("../storage/firebase-db", () => (
  {
    getPortalData: () => (
      {
        offering: {
          id: "offering-123"
        },
        portalJWT: {
          class_info_url: "https://example.com/api/v1/classes/123"
        },
        platformUserId: "abc345"
      }
    )
  }
));

describe("getReportUrl", () => {
  const basicParams = "/?activity=https://lara.example.com/api/v1/activities/345.json";

  beforeEach(() => {
    clearFirebaseAppName();
  });
  describe("with a run key", () => {
    const runKey = "b948ae4f-83e4-4448-a500-b6564bda3a08";
    const paramsWithRunKey = basicParams + "&runKey=" + runKey;
    it("returns valid report URL", () => {
      window.history.replaceState({}, "Test", paramsWithRunKey);

      const reportURL = getReportUrl();

      expect(reportURL).toEqual(
        kDevPortalReportUrl
        + "?runKey=" + runKey
        + "&activity=https://lara.example.com/activities/345"
        + "&firebase-app=report-service-dev"
        + "&sourceKey=lara.example.com"
        + "&answersSourceKey=activity-player.unexisting.url.com"
      );
    });

    it("returns valid report URL", () => {
      window.history.replaceState({}, "Test", paramsWithRunKey);

      const reportURL = getReportUrl();

      expect(reportURL).toEqual(
        kDevPortalReportUrl
        + "?runKey=" + runKey
        + "&activity=https://lara.example.com/activities/345"
        + "&firebase-app=report-service-dev"
        + "&sourceKey=lara.example.com"
        + "&answersSourceKey=activity-player.unexisting.url.com"
      );
    });

    it("includes the correct firebase-app if it is specified", () => {
      window.history.replaceState({}, "Test", paramsWithRunKey + "&firebaseApp=report-service-pro");

      const reportURL = getReportUrl();

      expect(reportURL).toEqual(
        kDevPortalReportUrl
        + "?runKey=" + runKey
        + "&activity=https://lara.example.com/activities/345"
        + "&firebase-app=report-service-pro"
        + "&sourceKey=lara.example.com"
        + "&answersSourceKey=activity-player.unexisting.url.com"
      );
    });
  });

  describe("without a run key" , () => {

    it("returns a valid reportURL", () => {
      window.history.replaceState({}, "Test", basicParams);

      const reportURL = getReportUrl();

      expect(reportURL).toEqual(
        kDevPortalReportUrl
        + "?class=https%3A%2F%2Fexample.com%2Fapi%2Fv1%2Fclasses%2F123"
        + "&firebase-app=report-service-dev"
        + "&offering=https%3A%2F%2Fexample.com%2Fapi%2Fv1%2Fofferings%2Foffering-123"
        + "&reportType=offering"
        + "&studentId=abc345"
        + "&sourceKey=lara.example.com"
        + "&answersSourceKey=activity-player.unexisting.url.com"
        + "&auth-domain=https://example.com");
    });

    it("includes correct firebase-app if the firebaseApp param is used", () => {
      window.history.replaceState({}, "Test", basicParams + "&firebaseApp=report-service-pro");
      const reportURL = getReportUrl();

      expect(reportURL).toEqual(
        kDevPortalReportUrl
        + "?class=https%3A%2F%2Fexample.com%2Fapi%2Fv1%2Fclasses%2F123"
        + "&firebase-app=report-service-pro"
        + "&offering=https%3A%2F%2Fexample.com%2Fapi%2Fv1%2Fofferings%2Foffering-123"
        + "&reportType=offering"
        + "&studentId=abc345"
        + "&sourceKey=lara.example.com"
        + "&answersSourceKey=activity-player.unexisting.url.com"
        + "&auth-domain=https://example.com");
    });
  });
});

describe("portalReportBaseUrl", () => {

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

  it("returns production url when the page url is https://activity-player.concord.org", () => {
    url.href = "https://activity-player.concord.org";
    expect(portalReportBaseUrl()).toBe(kProductionPortalReportUrl);
  });

  it("returns production url when the page is on a version url", () => {
    url.href = "https://activity-player.concord.org/version/v1.2.3";
    expect(portalReportBaseUrl()).toBe(kProductionPortalReportUrl);
  });

  it("returns dev url when page is on a branch url", () => {
    url.href = "https://activity-player.concord.org/branch/foo";
    expect(portalReportBaseUrl()).toBe(kDevPortalReportUrl);
  });

  it("returns dev url when page is on localhost url", () => {
    url.href = "http://localhost:8080";
    expect(portalReportBaseUrl()).toBe(kDevPortalReportUrl);
  });

  it("can be overridden to with a url parameter", () => {
    url.href = "https://activity-player.concord.org?portalReport=https://example.com";
    expect(portalReportBaseUrl()).toBe("https://example.com");
  });

});
