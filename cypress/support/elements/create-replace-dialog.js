import ActivityPage from "./activity-page";
import { getInIframe } from "./iframe";
import { getInIframeWithIndex } from "./iframe";

const activityPage = new ActivityPage;

class CreateReplaceDialog {

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
  getLabbookTakeSnapshotButton() {
    return getInIframe("body", ".base-app--runtime--question-int").find('.upload-button--upload-button--question-int');
  }
  getLabbookButton(button) {
    const option = ["Upload Image", "Take Snapshot"];
    return getInIframe("body", ".base-app--runtime--question-int").find('.upload-button--upload-button--question-int').eq(option.indexOf(button));
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
  getReplaceCurrentSnapshotButton() {
    return this.getCreateOrReplaceModalDialog().find('.upload-button--upload-button--question-int').eq(0);
  }
  getCreateNewSnapshotButton() {
    return this.getCreateOrReplaceModalDialog().find('.upload-button--upload-button--question-int').eq(1);
  }
  clickReplaceCurrentSnapshotButton() {
    this.getReplaceCurrentSnapshotButton().click();
  }
  clickCreateNewSnapshotButton() {
    this.getCreateNewSnapshotButton().click();
  }
  verifyCreateNewSnapshotButtonDisabled() {
    this.getCreateOrReplaceModalDialog().find('.upload-button--upload-button--question-int').eq(1).invoke("attr", "class").should("contain", "disabled");
  }
  verifyCreateOrReplaceDialogSnapshotInstruction() {
    this.getCreateOrReplaceModalDialog().find('.create-or-replace-image--instructions--question-int').should("contain", "Create New Snapshot is not available because you have reached the maximum number of entries.");
  }
  getDisabledThumbnail() {
    return this.getCreateOrReplaceModalDialog().find('.create-or-replace-image--fakeThumbnail--question-int');
  }
  verifyDisabledThumbnailTitle(title) {
    this.getDisabledThumbnail().find('[data-testid=thumbnail-title]').should("have.text", title);
  }


}
export default CreateReplaceDialog;
