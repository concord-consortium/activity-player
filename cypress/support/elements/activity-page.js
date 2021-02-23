class ActivityPage {
  getPage(num) {
    return cy.get("[data-cy=activity-page-links]").contains(num);
  }
  getNavPage(num) {
    return cy.get("[data-cy=nav-pages]").contains(num);
  }
  getSidebarTab() {
    return cy.get("[data-cy=sidebar-tab]");
  }
  getSidebarContent() {
    return cy.get("[data-cy=sidebar-content");
  }
  getSidebarCloseButton() {
    return cy.get("[data-cy=sidebar-close-button");
  }
  getHeader() {
    return cy.get("[data-cy=activity-header]");
  }
  getSecondaryEmbeddable(type) {
    //types=["image-question","text-box","multiple-choice-question","open-response-question",
    //      "labbook-question", "iframe-interactive-question","image-video-interactive", ]
    return cy.get("[data-cy="+type+"]");
  }
  getModalDialogMessage() {
    return cy.get("[data-cy=modal-dialog-label");
  }
  getModalDialogClose() {
    return cy.get("[data-cy=modal-dialog-close");
  }
  getLaunchListAuthoringNav(options) {
    return cy.get("[data-cy=launch-list-authoring-nav", options);
  }
  getLaunchListExitAuthoringButton() {
    return cy.get("[data-cy=launch-list-exit-authoring-button");
  }
  getLaunchListLoadingDialog(options) {
    return cy.get("[data-cy=launch-list-loading-dialog", options);
  }
  getOfflineActivities(options) {
    return cy.get("[data-cy=offline-activities", options);
  }
  getOfflineActivityList(options) {
    return cy.get("[data-cy=offline-activities] td.activity", options);
  }
  getActivityTitle(options) {
    return cy.get("[data-cy=activity-title", options);
  }

}
export default ActivityPage;
