import { v4 as uuidv4 } from "uuid";

import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;
const portalReportUrl = "https://portal-report.concord.org/branch/master/index.html";
context("Test Opening Portal Reports from various places", () => {
  describe("As an anonymous user", () => {
    const runKey = uuidv4();

    const activityExportUrl = "https://example.com/api/v1/activities/123.json";
    const activityStructureUrl = "https://example.com/activities/123";
    const activityPlayerUrl = "?" +
      "activity="+activityExportUrl+
      "&report-source=authoring.staging.concord.org" +
      "&runKey="+runKey;

    before(() => {
      // Stub out the request to the activityExportUrl
      // The use of a RegExp starting with ^ prevents this from also matching the initial visit
      // which also includes this same activityExportUrl
      cy.intercept(new RegExp("^" + activityExportUrl), {
        fixture: "sample-activity-1.json"
      }
      );
      cy.visit(activityPlayerUrl, {
        onBeforeLoad(win) {
          cy.stub(win, "open");
        }
      });
      activityPage.getPage(5).click();
      cy.wait(1000);
    });
    describe("Open report from end of activity without completion page", () => {
      it("verify correct link is sent to the portal report", () => {
        cy.get("[data-cy=exit-container] > .show-my-work").should("be.visible").click();
        cy.window().its("open").should("be.calledWith",
          portalReportUrl + "?runKey=" + runKey +
            "&activity=" + activityStructureUrl +
            "&firebase-app=report-service-dev&sourceKey=example.com" +
            "&answersSourceKey=authoring.staging.concord.org");
      });
    });
    // describe("Open report from completion page", () => {

    // });
  });
});
