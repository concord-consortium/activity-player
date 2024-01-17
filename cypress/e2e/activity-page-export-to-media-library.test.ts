import ActivityPage from "../support/elements/activity-page";
import ExportToMediaLibrary from "../support/elements/export-to-media-library";

const activityPage = new ActivityPage;
const exportToMediaLibrary = new ExportToMediaLibrary;

const file = {
  image: "cypress/fixtures/image/water-drop-300-250.png"
};

function beforeTest() {
  cy.visit("?activity=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Factivities%2F223.json&preview");
    activityPage.getActivityTitle().should("contain", "Automation Activity For AP Export To Media Library");
}

context("Test the overall app", () => {
  describe("Image Question",() => {
    it("verify image question with export to media library",()=>{
      beforeTest();
      activityPage.getNavPageButton(0).click();
      cy.wait(5000);
      exportToMediaLibrary.getUploadImageButton().click();
      exportToMediaLibrary.getUploadFromMediaLibraryDialog().should("exist");
      exportToMediaLibrary.verifyDropAreaContent();
      exportToMediaLibrary.verifyMediaLibraryPickerContent();
      exportToMediaLibrary.verifyMediaAltText();
      exportToMediaLibrary.verifyUploadFromActivityButtonDisabled();
      exportToMediaLibrary.selectMedia(0);
      exportToMediaLibrary.verifyMediaSelected(0);
      exportToMediaLibrary.verifyUploadFromActivityButtonEnabled();
      exportToMediaLibrary.clickUploadFromActivityButton();
      exportToMediaLibrary.getDrawingToolContainer().should("exist");
      exportToMediaLibrary.clickDoneButton();
      exportToMediaLibrary.verifyImageUpdated();
      exportToMediaLibrary.getUploadImageButton().click();
      exportToMediaLibrary.getUploadFromMediaLibraryDialog().should("exist");
      exportToMediaLibrary.uploadImageFromYourDevice(file.image);
      exportToMediaLibrary.getDrawingToolContainer().should("exist");
      exportToMediaLibrary.clickDoneButton();
      exportToMediaLibrary.verifyImageUpdated();
      
    });
  });
  describe("Drawing Tool",() => {
    it("verify drawing tool with export to media library",()=>{
      beforeTest();
      activityPage.getNavPageButton(1).click();
      cy.wait(5000);
      exportToMediaLibrary.getUploadImageButton().click();
      exportToMediaLibrary.getUploadFromMediaLibraryDialog().should("exist");
      exportToMediaLibrary.verifyDropAreaContent();
      exportToMediaLibrary.verifyMediaLibraryPickerContent();
      exportToMediaLibrary.verifyMediaAltText();
      exportToMediaLibrary.verifyUploadFromActivityButtonDisabled();
      exportToMediaLibrary.selectMedia(0);
      exportToMediaLibrary.verifyMediaSelected(0);
      exportToMediaLibrary.verifyUploadFromActivityButtonEnabled();
      exportToMediaLibrary.clickUploadFromActivityButton();
      cy.wait(2000);
      exportToMediaLibrary.getUploadImageButton().click();
      exportToMediaLibrary.getUploadFromMediaLibraryDialog().should("exist");
      exportToMediaLibrary.uploadImageFromYourDevice(file.image);
      cy.wait(2000);
    });
  });
  describe("Labbook",() => {
    it("verify Labbook with export to media library",()=>{
      beforeTest();
      activityPage.getNavPageButton(2).click();
      cy.wait(5000);
      exportToMediaLibrary.getLabbookUploadImageButton().click();
      exportToMediaLibrary.getLabbookUploadFromMediaLibraryDialog().should("exist");
      exportToMediaLibrary.verifyDropAreaContent();
      exportToMediaLibrary.verifyMediaLibraryPickerContent();
      exportToMediaLibrary.verifyMediaAltText();
      exportToMediaLibrary.verifyUploadFromActivityButtonDisabled();
      exportToMediaLibrary.selectMedia(0);
      exportToMediaLibrary.verifyMediaSelected(0);
      exportToMediaLibrary.verifyUploadFromActivityButtonEnabled();
      exportToMediaLibrary.clickUploadFromActivityButton();
      cy.wait(2000);
      exportToMediaLibrary.VerifyThumbnailUpdated(0);
      exportToMediaLibrary.getLabbookUploadImageButton().click();
      exportToMediaLibrary.getCreateOrReplaceModalDialog().should("exist");
      exportToMediaLibrary.verifyCreateOrReplaceHeader();
      exportToMediaLibrary.VerifyModalDialogThumbnailUpdated(0);
      exportToMediaLibrary.VerifyyModalDialogBlankThumbnail(1);
      exportToMediaLibrary.verifyThumbnailTitle(0, "A");
      exportToMediaLibrary.clickReplaceCurrentImageButton();
      exportToMediaLibrary.getLabbookUploadFromMediaLibraryDialog().should("exist");
      exportToMediaLibrary.uploadImageFromYourDevice(file.image);
      cy.wait(2000);
      exportToMediaLibrary.verifyThumbnailNewText(1);
      exportToMediaLibrary.VerifyBlankThumbnail(1);
      exportToMediaLibrary.getLabbookUploadImageButton().click();
      exportToMediaLibrary.getCreateOrReplaceModalDialog().should("exist");
      exportToMediaLibrary.clickCreateNewImageButton();
      exportToMediaLibrary.selectMedia(1);
      exportToMediaLibrary.verifyMediaSelected(1);
      exportToMediaLibrary.verifyUploadFromActivityButtonEnabled();
      exportToMediaLibrary.clickUploadFromActivityButton();
      cy.wait(2000);
      exportToMediaLibrary.VerifyThumbnailUpdated(1);
      exportToMediaLibrary.getLabbookUploadImageButton().click();
      exportToMediaLibrary.getCreateOrReplaceModalDialog().should("exist");
      exportToMediaLibrary.VerifyModalDialogThumbnailUpdated(0);
      exportToMediaLibrary.verifyThumbnailTitle(0, "B");
      exportToMediaLibrary.verifyCreateNewImageButtonDisabled();
      exportToMediaLibrary.verifyThumbnailDisabled();
      exportToMediaLibrary.verifyCreateOrReplaceDialogInstruction();
      exportToMediaLibrary.clickCancelButton();
      cy.wait(1000);
    });
  });
  describe("Labbook Wide",() => {
    it("verify Labbook Wide with export to media library",()=>{
      beforeTest();
      activityPage.getNavPageButton(3).click();
      cy.wait(5000);
      exportToMediaLibrary.getLabbookUploadImageButton().click();
      exportToMediaLibrary.getLabbookUploadFromMediaLibraryDialog().should("exist");
      exportToMediaLibrary.verifyDropAreaContent();
      exportToMediaLibrary.verifyMediaLibraryPickerContent();
      exportToMediaLibrary.verifyMediaAltText();
      exportToMediaLibrary.verifyUploadFromActivityButtonDisabled();
      exportToMediaLibrary.selectMedia(0);
      exportToMediaLibrary.verifyMediaSelected(0);
      exportToMediaLibrary.verifyUploadFromActivityButtonEnabled();
      exportToMediaLibrary.clickUploadFromActivityButton();
      cy.wait(2000);
      exportToMediaLibrary.VerifyThumbnailUpdated(0);
      exportToMediaLibrary.getLabbookUploadImageButton().click();
      exportToMediaLibrary.getCreateOrReplaceModalDialog().should("exist");
      exportToMediaLibrary.verifyCreateOrReplaceHeader();
      exportToMediaLibrary.VerifyModalDialogThumbnailUpdated(0);
      exportToMediaLibrary.VerifyyModalDialogBlankThumbnail(1);
      exportToMediaLibrary.verifyThumbnailTitle(0, "A");
      exportToMediaLibrary.clickReplaceCurrentImageButton();
      exportToMediaLibrary.getLabbookUploadFromMediaLibraryDialog().should("exist");
      exportToMediaLibrary.uploadImageFromYourDevice(file.image);
      cy.wait(2000);
      exportToMediaLibrary.verifyThumbnailNewText(1);
      exportToMediaLibrary.VerifyBlankThumbnail(1);
      exportToMediaLibrary.getLabbookUploadImageButton().click();
      exportToMediaLibrary.getCreateOrReplaceModalDialog().should("exist");
      exportToMediaLibrary.clickCreateNewImageButton();
      exportToMediaLibrary.selectMedia(1);
      exportToMediaLibrary.verifyMediaSelected(1);
      exportToMediaLibrary.verifyUploadFromActivityButtonEnabled();
      exportToMediaLibrary.clickUploadFromActivityButton();
      cy.wait(2000);
      exportToMediaLibrary.VerifyThumbnailUpdated(1);
      exportToMediaLibrary.getLabbookUploadImageButton().click();
      exportToMediaLibrary.getCreateOrReplaceModalDialog().should("exist");
      exportToMediaLibrary.VerifyModalDialogThumbnailUpdated(0);
      exportToMediaLibrary.verifyThumbnailTitle(0, "B");
      exportToMediaLibrary.verifyCreateNewImageButtonDisabled();
      exportToMediaLibrary.verifyThumbnailDisabled();
      exportToMediaLibrary.verifyCreateOrReplaceDialogInstruction();
      exportToMediaLibrary.clickCancelButton();
      cy.wait(1000);
    });
  });
});
