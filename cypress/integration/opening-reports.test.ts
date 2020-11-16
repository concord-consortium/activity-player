import ActivityPage from "../support/elements/activity-page";
import { queryValue } from "../../src/utilities/url-query";

const activityPage = new ActivityPage;
const portalReportUrl = "https://portal-report.concord.org/branch/master/";
const activity = "activity=https://authoring.staging.concord.org/api/v1/activities/20819.json&firebase-app=report-service-dev&report-source=authoring.staging.concord.org";
const activityUrl = ((activity.split(".json"))[0]).replace("api/v1/","");
let runKey = "";
context("Test Opening Portal Reports from various places", () => {
  describe("As an anonymous user", () => {
    before(() => {
      cy.visit("?"+activity, {
        onBeforeLoad(win) {
          cy.stub(win, "open");
        }
      });
      activityPage.getPage(2).click();
      // cy.get("textarea").type(testText);
      runKey = queryValue("runKey");
    });
    describe("Open report from end of activity without completion page", () => {
      it("verify correct link is sent to the portal report", () => {
        cy.get("[data-cy=bottom-button-report]").should("be.visible").click();
        cy.window().its("open").should("be.calledWith",  portalReportUrl+"?runKey="+runKey+"&activity="+activityUrl+"&answerSource=localhost");
      });
    });
    // describe("Open report from completion page", () => {

    // });
  });
});
