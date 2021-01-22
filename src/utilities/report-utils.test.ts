import { getReportUrl } from "./report-utils";
import { clearFirebaseAppName } from "../portal-api";

jest.mock("../firebase-db", () => (
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
  beforeEach(() => {
    clearFirebaseAppName();
  });

  it("returns a valid reportURL with basic AP params", () => {
    window.history.replaceState({}, "Test", "/?activity=https://lara.example.com/api/v1/activities/345.json");

    const reportURL = getReportUrl();

    expect(reportURL).toEqual(
      "https://portal-report.concord.org/branch/master/index.html?"
      + "class=https%3A%2F%2Fexample.com%2Fapi%2Fv1%2Fclasses%2F123"
      + "&firebase-app=report-service-dev"
      + "&offering=https%3A%2F%2Fexample.com%2Fapi%2Fv1%2Fofferings%2Foffering-123"
      + "&reportType=offering"
      + "&studentId=abc345"
      + "&sourceKey=lara.example.com"
      + "&answersSourceKey=activity-player.unexisting.url.com"
      + "&auth-domain=https://example.com");
  });

  it("returns a reportURL with the correct firebase-app if the firebaseApp param is used", () => {
    window.history.replaceState({}, "Test", "/?firebaseApp=report-service-pro&activity=https://lara.example.com/api/v1/activities/345.json");
    const reportURL = getReportUrl();

    expect(reportURL).toEqual(
      "https://portal-report.concord.org/branch/master/index.html?"
      + "class=https%3A%2F%2Fexample.com%2Fapi%2Fv1%2Fclasses%2F123"
      + "&firebase-app=report-service-pro"
      + "&offering=https%3A%2F%2Fexample.com%2Fapi%2Fv1%2Fofferings%2Foffering-123"
      + "&reportType=offering"
      + "&studentId=abc345"
      + "&sourceKey=lara.example.com"
      + "&answersSourceKey=activity-player.unexisting.url.com"
      + "&auth-domain=https://example.com");
  });
});
