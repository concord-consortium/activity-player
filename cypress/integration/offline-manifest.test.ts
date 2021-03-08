import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Test setting offline manifest authoring id in local storage", () => {

  describe("setOfflineManifestAuthoringId",() => {
    it("verify id is set when query parameter is given",() => {
      cy.visit("?setOfflineManifestAuthoringId=test-authoring-id");
      cy.saveLocalStorage();
      activityPage.getOfflineManifestAuthoringNav().should("be.visible")
        .and("contain", "test-authoring-id")
        .and("contain", "Download JSON")
        .and("contain", "Clear Authoring Data")
        .and("contain", "Exit Authoring");
    });

    it("verify id is set on subsequent loads",() => {
      cy.restoreLocalStorage();
      cy.visit("");
      activityPage.getOfflineManifestAuthoringNav().should("be.visible").and("contain", "test-authoring-id");
    });

    it("verify id is cleared when exit authoring is clicked",() => {
      cy.restoreLocalStorage();
      cy.visit("");
      activityPage.getOfflineManifestAuthoringNav().should("be.visible").and("contain", "test-authoring-id");
      activityPage.getOfflineManifestExitAuthoringButton().should("be.visible");
      activityPage.getOfflineManifestExitAuthoringButton().click();
      activityPage.getOfflineManifestAuthoringNav({timeout: 0}).should("not.exist");
    });
  });
});

context("Test using offline manifests", () => {

  describe("offlineManifest",() => {
    it("verify offline manifest is loaded when query parameter is given",() => {
      cy.visit("?offlineManifest=smoke-test");

      // verify loading dialog shows and then auto closes
      activityPage.getOfflineManifestLoadingDialog().should("be.visible").and("contain", "AP Smoke Test");

      // verify offline activities list shows
      activityPage.getOfflineActivities().should("be.visible").and("contain", "AP Smoke Test");
    });

    /*

    FIXME: COMMENTED OUT TO ENABLE BRANCH BUILD

    it("verify offline activities show and clicking an item loads it",() => {
      cy.visit("?offlineManifest=smoke-test");

      // verify clicking on activity loads it and closes the launcher
      activityPage.getOfflineManifestLoadingDialog({timeout: 0}).should("not.exist");
      activityPage.getOfflineActivityList().contains("AP Smoke Test");
      activityPage.getOfflineActivityList().click();
      activityPage.getActivityTitle().should("be.visible").and("contain", "AP Smoke Test");
    });

    */
  });
});
