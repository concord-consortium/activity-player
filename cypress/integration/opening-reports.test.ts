import { v4 as uuidv4 } from "uuid";

import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;
const portalReportUrl = "https://portal-report.concord.org/branch/master/";
context.skip("Test Opening Portal Reports from various places", () => { //need to wait for corresponding portal-report work to be merged in
  describe("As an anonymous user", () => {
    const runKey = uuidv4();
    const activity = "activity=https://authoring.staging.concord.org/api/v1/activities/20819.json&firebase-app=report-service-dev&report-source=authoring.staging.concord.org&runKey="+runKey;
    const activityUrl = ((activity.split(".json"))[0]).replace("api/v1/","");

    before(() => {
      cy.visit("?"+activity, {
        onBeforeLoad(win) {
          cy.stub(win, "open");
        }
      });
      activityPage.getPage(2).click();
    });
    describe("Open report from end of activity without completion page", () => {
      it("verify correct link is sent to the portal report", () => {
        cy.get("[data-cy=bottom-button-report]").should("be.visible").click();
        cy.window().its("open").should("be.calledWith",  portalReportUrl+"?runKey="+runKey+"&"+activityUrl+"&answerSource=localhost");
      });
    });
    // describe("Open report from completion page", () => {

    // });
  });
});
