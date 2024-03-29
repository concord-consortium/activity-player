import ActivityPage from "../support/elements/activity-page";
import ExportToMediaLibrary from "../support/elements/export-to-media-library";
import CreateReplaceDialog from "../support/elements/create-replace-dialog";

const activityPage = new ActivityPage;
const exportToMediaLibrary = new ExportToMediaLibrary;
const createReplaceDialog = new CreateReplaceDialog;

function beforeTest() {
  cy.visit("?activity=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Factivities%2F249.json&preview");
    activityPage.getActivityTitle().should("contain", "Automation Activity For AP Labbook Take Snapshot Dialog");
}

context("Test the overall app", () => {
  describe("Labbook",() => {
    it("verify Labbook Take Snapshot Dialog",()=>{
      beforeTest();
      activityPage.getNavPageButton(0).click();
      cy.wait(5000);
      createReplaceDialog.getLabbookTakeSnapshotButton().click();
      cy.wait(10000);
      createReplaceDialog.VerifyThumbnailUpdated(0);
      createReplaceDialog.getLabbookTakeSnapshotButton().click();
      createReplaceDialog.getCreateOrReplaceModalDialog().should("exist");
      createReplaceDialog.verifyCreateOrReplaceHeader();
      createReplaceDialog.VerifyModalDialogThumbnailUpdated(0);
      createReplaceDialog.VerifyyModalDialogBlankThumbnail(1);
      createReplaceDialog.verifyThumbnailTitle(0, "A");
      createReplaceDialog.verifyThumbnailTitle(1, "B");
      createReplaceDialog.getReplaceCurrentSnapshotButton().should("have.text", "Replace Current Snapshot");
      createReplaceDialog.getCreateNewSnapshotButton().should("have.text", "Create New Snapshot");
      createReplaceDialog.clickReplaceCurrentSnapshotButton();
      cy.wait(10000);
      createReplaceDialog.verifyThumbnailNewText(1);
      createReplaceDialog.VerifyBlankThumbnail(1);
      createReplaceDialog.getLabbookTakeSnapshotButton().click();
      createReplaceDialog.getCreateOrReplaceModalDialog().should("exist");
      createReplaceDialog.clickCreateNewSnapshotButton();
      cy.wait(10000);
      createReplaceDialog.VerifyThumbnailUpdated(1);
      createReplaceDialog.getLabbookTakeSnapshotButton().click();
      createReplaceDialog.getCreateOrReplaceModalDialog().should("exist");
      createReplaceDialog.VerifyModalDialogThumbnailUpdated(0);
      createReplaceDialog.verifyThumbnailTitle(0, "B");
      createReplaceDialog.verifyCreateNewSnapshotButtonDisabled();
      createReplaceDialog.verifyThumbnailDisabled();
      createReplaceDialog.getDisabledThumbnail().should("exist");
      createReplaceDialog.verifyDisabledThumbnailTitle("C");
      createReplaceDialog.verifyCreateOrReplaceDialogSnapshotInstruction();
      createReplaceDialog.clickCancelButton();
      cy.wait(1000);
    });
  });
  describe("Labbook Wide",() => {
    it("verify Labbook Wide Take Snapshot Dialog",()=>{
      beforeTest();
      activityPage.getNavPageButton(1).click();
      cy.wait(5000);
      createReplaceDialog.getLabbookTakeSnapshotButton().click();
      cy.wait(10000);
      createReplaceDialog.VerifyThumbnailUpdated(0);
      createReplaceDialog.getLabbookTakeSnapshotButton().click();
      createReplaceDialog.getCreateOrReplaceModalDialog().should("exist");
      createReplaceDialog.verifyCreateOrReplaceHeader();
      createReplaceDialog.VerifyModalDialogThumbnailUpdated(0);
      createReplaceDialog.VerifyyModalDialogBlankThumbnail(1);
      createReplaceDialog.verifyThumbnailTitle(0, "A");
      createReplaceDialog.verifyThumbnailTitle(1, "B");
      createReplaceDialog.getReplaceCurrentSnapshotButton().should("have.text", "Replace Current Snapshot");
      createReplaceDialog.getCreateNewSnapshotButton().should("have.text", "Create New Snapshot");
      createReplaceDialog.clickReplaceCurrentSnapshotButton();
      cy.wait(10000);
      createReplaceDialog.verifyThumbnailNewText(1);
      createReplaceDialog.VerifyBlankThumbnail(1);
      createReplaceDialog.getLabbookTakeSnapshotButton().click();
      createReplaceDialog.getCreateOrReplaceModalDialog().should("exist");
      createReplaceDialog.clickCreateNewSnapshotButton();
      cy.wait(10000);
      createReplaceDialog.VerifyThumbnailUpdated(1);
      createReplaceDialog.getLabbookTakeSnapshotButton().click();
      createReplaceDialog.getCreateOrReplaceModalDialog().should("exist");
      createReplaceDialog.VerifyModalDialogThumbnailUpdated(0);
      createReplaceDialog.verifyThumbnailTitle(0, "B");
      createReplaceDialog.verifyCreateNewSnapshotButtonDisabled();
      createReplaceDialog.verifyThumbnailDisabled();
      createReplaceDialog.getDisabledThumbnail().should("exist");
      createReplaceDialog.verifyDisabledThumbnailTitle("C");
      createReplaceDialog.verifyCreateOrReplaceDialogSnapshotInstruction();
      createReplaceDialog.clickCancelButton();
      cy.wait(1000);
    });
  });
  describe("Labbook Upload From Media Library",() => {
    it("verify Upload From Media Library Not Displayed For Take Snapshot",()=>{
      beforeTest();
      activityPage.getNavPageButton(3).click();
      cy.wait(5000);
      cy.log("Labbook interactive with upload from media option enabled");
      createReplaceDialog.getLabbookButton("Take Snapshot").click();
      cy.wait(10000);
      exportToMediaLibrary.verifyUploadFromMediaLibraryDialogNotDisplayed();
      createReplaceDialog.VerifyThumbnailUpdated(0);
      createReplaceDialog.getLabbookButton("Take Snapshot").click();
      createReplaceDialog.getCreateOrReplaceModalDialog().should("exist");
      createReplaceDialog.clickReplaceCurrentSnapshotButton();
      cy.wait(10000);
      exportToMediaLibrary.verifyUploadFromMediaLibraryDialogNotDisplayed();
      cy.wait(1000);
      activityPage.getNavPageButton(4).click();
      cy.wait(5000);
      cy.log("Labbook Wide interactive with upload from media option enabled");
      createReplaceDialog.getLabbookButton("Take Snapshot").click();
      cy.wait(10000);
      exportToMediaLibrary.verifyUploadFromMediaLibraryDialogNotDisplayed();
      createReplaceDialog.VerifyThumbnailUpdated(0);
      createReplaceDialog.getLabbookButton("Take Snapshot").click();
      createReplaceDialog.getCreateOrReplaceModalDialog().should("exist");
      createReplaceDialog.clickReplaceCurrentSnapshotButton();
      cy.wait(10000);
      exportToMediaLibrary.verifyUploadFromMediaLibraryDialogNotDisplayed();
      cy.wait(1000);
    });
  });
});
