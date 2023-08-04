import ActivityPage from "./activity-page";
import { getInIframe } from "./iframe";

const activityPage = new ActivityPage;

class ExportToMediaLibrary {
  getUploadImageButton() {
    return getInIframe("body", ".base-app--runtime--question-int").find('[data-test=upload-btn]');
  }
  getUploadFromMediaLibraryDialog() {
    return getInIframe("body", ".upload-from-media-library-dialog--modalContent--question-int");
  }
  getDragToUploadContainer() {
    return getInIframe("body", '.drag-to-upload--container--question-int');
  }
  verifyDropAreaContent() {
    this.getDragToUploadContainer().find('[data-test=drop-area]').should("contain", "Drop an image here or click the button below to choose an image");
  }
  uploadImageFromYourDevice(file) {
      this.getDragToUploadContainer().find('#file-upload-drop-file-upload').selectFile(file, { force: true });
      cy.wait(5000);
  }
  getMediaLibraryPickerContainer() {
    return getInIframe("body", '.media-library-picker--container--question-int');
  }
  verifyMediaLibraryPickerContent() {
    this.getMediaLibraryPickerContainer().find('.media-library-picker--instructions--question-int').should("contain", "Upload an image from this activity:");
  }
  selectMedia(index) {
    this.getMediaLibraryPickerContainer().find('.media-library-picker--thumbnail--question-int').eq(index).click();
  }
  verifyMediaSelected(index) {
    this.getMediaLibraryPickerContainer().find('.media-library-picker--thumbnail--question-int').eq(index).invoke("attr", "class").should("contain", "selected");
  }
  verifyMediaAltText() {
    this.getMediaLibraryPickerContainer().find('.media-library-picker--toolTip--question-int').eq(0).should("have.text", "Image Interactive Alt Text");
    this.getMediaLibraryPickerContainer().find('.media-library-picker--toolTip--question-int').eq(1).should("have.text", "Drag and Drop");
    this.getMediaLibraryPickerContainer().find('.media-library-picker--toolTip--question-int').eq(2).should("have.text", "image");
  }
  getMediaLibraryPickerBottomButtons() {
    return getInIframe("body", '.media-library-picker--bottomButtons--question-int');
  }
  verifyUploadFromActivityButtonEnabled() {
    this.getMediaLibraryPickerBottomButtons().find('.helpers--interactiveButton--question-int').eq(0).invoke("attr", "disabled").should("not.exist");
  }
  verifyUploadFromActivityButtonDisabled() {
    this.getMediaLibraryPickerBottomButtons().find('.helpers--interactiveButton--question-int').eq(0).invoke("attr", "disabled").should("exist");
  }
  clickUploadFromActivityButton() {
    this.getMediaLibraryPickerBottomButtons().find('.helpers--interactiveButton--question-int').eq(0).click();
  }
  clickCancelButton() {
    this.getMediaLibraryPickerBottomButtons().find('.media-library-picker--cancelButton--question-int').click();
  }
  getDrawingToolContainer() {
    return getInIframe("body", ".dt-container");
  }
  clickDoneButton() {
    getInIframe("body", "[data-test=close-dialog-btn]").click();
    cy.wait(5000);
  }
  verifyImageUpdated() {
    getInIframe("body", ".inline-content--inlineImg--question-int").should("exist");
  }

  //Labbook
  getLabbookUploadFromMediaLibraryDialog() {
    return getInIframe("body", ".upload-image-modal--modalContent--question-int");
  }
  getLabbookUploadImageButton() {
    return getInIframe("body", ".base-app--runtime--question-int").find('.upload-button--upload-button--question-int');
  }
  getThumbnailContainer() {
    return getInIframe("body", "[data-testid=thumbnail-chooser]");
  }
  getThumbnail(index) {
    return this.getThumbnailContainer().find('[data-testid=thumbnail-wrapper]').eq(index);
  }
  VerifyThumbnailUpdated(index) {
    this.getThumbnail(index).find('.canvas-container').should("exist");
  }
  verifyThumbnailNewText(index) {
    this.getThumbnail(index).find('.thumbnail-wrapper--empty-content--question-int').should("have.text", "New");
  }
  VerifyBlankThumbnail(index) {
  this.getThumbnail(index).find('.canvas-container').should("not.exist");
  }
  
  //Upload Image Modal Dialog
  getCreateOrReplaceModalDialog() {
    return getInIframe("body", ".upload-image-modal--modalContent--question-int");
  }
  verifyCreateOrReplaceHeader() {
    this.getCreateOrReplaceModalDialog().find('.create-or-replace-image--header--question-int').should("contain", "What would you like to do?");
  }
  getModalDialogThumbnailContainer() {
    return this.getCreateOrReplaceModalDialog().find("[data-testid=thumbnail-chooser]");
  }
  getModalDialogThumbnail(index) {
    return this.getModalDialogThumbnailContainer().find('[data-testid=thumbnail-wrapper]').eq(index);
  }
  verifyThumbnailTitle(index, title) {
    this.getModalDialogThumbnail(index).find('[data-testid=thumbnail-title]').should("have.text", title);
  }
  VerifyModalDialogThumbnailUpdated(index) {
    this.getModalDialogThumbnail(index).find('.canvas-container').should("exist");
  }
  VerifyyModalDialogBlankThumbnail(index) {
    this.getModalDialogThumbnail(index).find('.canvas-container').should("not.exist");
  }
  clickReplaceCurrentImageButton() {
    this.getCreateOrReplaceModalDialog().find('.upload-button--upload-button--question-int').eq(0).click();
  }
  clickCreateNewImageButton() {
    this.getCreateOrReplaceModalDialog().find('.upload-button--upload-button--question-int').eq(1).click();
  }
  clickCancelButton() {
    this.getCreateOrReplaceModalDialog().find('.create-or-replace-image--cancelButton--question-int').click();
  }
  verifyCreateOrReplaceDialogInstruction() {
    this.getCreateOrReplaceModalDialog().find('.create-or-replace-image--instructions--question-int').should("contain", "Create New Image is not available because you have reached the maximum number of entries.");
  }
  verifyCreateNewImageButtonDisabled() {
    this.getCreateOrReplaceModalDialog().find('.upload-button--upload-button--question-int').eq(1).invoke("attr", "class").should("contain", "disabled");
  }
  verifyThumbnailDisabled() {
    this.getCreateOrReplaceModalDialog().find('.create-or-replace-image--fakeThumbnail--question-int').should("exist");
  }


}
export default ExportToMediaLibrary;
