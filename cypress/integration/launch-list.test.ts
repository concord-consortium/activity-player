import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Test setting launch list authoring id in local storage", () => {

  describe("setLaunchListAuthoringId",() => {
    it("verify id is set when query parameter is given",() => {
      cy.visit("?setLaunchListAuthoringId=test-authoring-id");
      cy.saveLocalStorage();
      activityPage.getLaunchListAuthoringNav().should("be.visible")
        .and("contain", "test-authoring-id")
        .and("contain", "Download JSON")
        .and("contain", "Clear Authoring Data")
        .and("contain", "Exit Authoring");
    });

    it("verify id is set on subsequent loads",() => {
      cy.restoreLocalStorage();
      cy.visit("");
      activityPage.getLaunchListAuthoringNav().should("be.visible").and("contain", "test-authoring-id");
    });

    it("verify id is cleared when exit authoring is clicked",() => {
      cy.restoreLocalStorage();
      cy.visit("");
      activityPage.getLaunchListAuthoringNav().should("be.visible").and("contain", "test-authoring-id");
      activityPage.getLaunchListExitAuthoringButton().should("be.visible");
      activityPage.getLaunchListExitAuthoringButton().click();
      activityPage.getLaunchListAuthoringNav({timeout: 0}).should("not.exist");
    });
  });
});

context("Test using launch lists", () => {

  describe("launchList",() => {
    it("verify launch list if loaded when query parameter is given",() => {
      cy.visit("?launchList=smoke-test");

      // verify loading dialog shows and then auto closes
      activityPage.getLaunchListLoadingDialog().should("be.visible").and("contain", "AP Smoke Test");

      // verify offline activities list shows
      activityPage.getOfflineActivities().should("be.visible").and("contain", "AP Smoke Test");
    });

    it("verify offline activities show and clicking an item loads it",() => {
      cy.visit("?launchList=smoke-test");

      // verify clicking on activity loads it and closes the launcher
      activityPage.getLaunchListLoadingDialog({timeout: 0}).should("not.exist");
      activityPage.getOfflineActivityList().contains("AP Smoke Test").click();
      activityPage.getActivityTitle().should("be.visible").and("contain", "AP Smoke Test");
    });
  });
});
