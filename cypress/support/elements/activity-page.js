class ActivityPage {
  getActivity() {
    return cy.get("[data-cy=activity]");
  }
  getPage(num) {
    return cy.get("[data-cy=activity-page-links]").contains(num);
  }
  getHomeButton() {
    return cy.get("[data-cy=home-button]");
  }
  getNavPage(num) {
    return cy.get("[data-cy=nav-pages]").contains(num);
  }
  getCompletionPage() {
    return cy.get("[data-cy=nav-pages-completion-page-button]");
  }
  getPreviousPageButton() {
    return cy.get("[data-cy=previous-page-button");
  }
  getNextPageButton() {
    return cy.get("[data-cy=next-page-button");
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
    return cy.get("[data-cy=modal-dialog-label]");
  }
  getModalDialogClose() {
    return cy.get("[data-cy=modal-dialog-close]");
  }
  getCollapsibleHeader() {
    return cy.get("[data-cy=collapsible-header]");
  }
  //Header
  getHeaderActivityTitle() {
    return cy.get('[data-cy=activity-title]');
  }
  getAccountOwnerName() {
    return cy.get('.account-owner-name');
  }
  getPageButton() {
    return cy.get('[data-cy=nav-pages-button]').eq(0);
  }
  clickPageButton(index){
    cy.get('[data-cy=nav-pages-button]').eq(index).click();
  }
  clickHomePage() {
    return cy.get('[data-cy=home-button]').eq(0).click();
  }
  clickNextPageArrow() {
    return cy.get('[data-cy=next-page-button]').eq(0).click();
  }
  clickCompletionPageButton() {
    return cy.get('[data-cy=nav-pages-completion-page-button]').eq(0).click();
  }
  //Footer
  getFooter() {
    return cy.get('[data-cy=footer]');
  }
  getFooterText() {
    return this.getFooter().find('.footer-text p');
  }
  getVersionInfo() {
    return cy.get('[data-cy=version-info]');
  }
  // Home Page
  getActivitySummary() {
    return cy.get('[data-cy=activity-summary]');
  }
  getActivityTitle() {
    return this.getActivitySummary().find('h1 div');
  }
  getReadAloudToggle() {
    return this.getActivitySummary().find('#label-read_aloud_toggle');
  }
  getIntroText() {
    return this.getActivitySummary().find('.activity-content.intro-txt p');
  }
  getEstimatedTime() {
    return this.getActivitySummary().find('[data-cy=estimated-time] .estimate');
  }
  getPagesHeader() {
    return cy.get('[data-cy=activity-page-links] .pages div')
  }
  getPageItemNo() {
    return cy.get('[data-cy=activity-page-links] .page-item span').eq(0);
  }
  getPageItemLink() {
    return cy.get('[data-cy=activity-page-links] .page-item span').eq(1);
  }
  clickPageItem(index) {
    return cy.get('[data-cy=activity-page-links] .page-item').eq(index).click();
  }

  getPageContent() {
    return cy.get('[data-cy=page-content]');
  }
  getPageContentHeader() {
    return this.getPageContent().find('.name  div');
  }
  verifyPageContentHeader(header) {
    return this.getPageContent().find('.name  div').should("contain", header);
  }
  getInteractive() {
    return cy.get('[data-cy=managed-interactive]');
  }
  getQuestionHeader() {
    return this.getInteractive().find('.header div').eq(0);
  }
  verifyQuestionHeader(header) {
    this.getQuestionHeader().should("contain", header);
  }
  openHint() {
    this.getInteractive().find('[data-cy=open-hint]').eq(0).click();
  }
  getHintText() {
    return this.getInteractive().find('.hint.question-txt');
  }

  //Alert Dialog
  verifyAlertDialog() {
    cy.get('.ReactModal__Content--after-open.modal-dialog').should("exist");
  }
  getModalDialogHeader() {
    return cy.get('[data-cy=modal-dialog-header]');
  }
  getModalDialogLabel() {
    return cy.get('[data-cy=modal-dialog-label]');
  }
  clickCloseButton() {
    cy.get('[data-cy=modal-dialog-close]').click();
  }

  //Text Block
  getTextBlockName() {
    return cy.get('[data-cy=text-box] .text-name')
  }
  getTextBlockContent() {
    return cy.get('[data-cy=text-box] .content')
  }

  //Summary Page
  getProgressText() {
    return cy.get('[data-cy=progress-text]');
  }
  getSummaryActivityTitle() {
    return cy.get('.summary-of-work .activity-title');
  }
  getSummaryTableHead() {
    return cy.get('[data-cy=summary-table] thead tr div').eq(0);
  }
  getSummaryTableRow() {
    return cy.get('[data-cy=summary-table-row] td div').eq(0);
  }
  getShowMyWorkButton() {
    return cy.get('.button.show-my-work');
  }
  getOrText() {
    return cy.get('.exit-button span');
  }
  getExitTextButton() {
    return cy.get('.exit-button .textButton');
  }

  //Read Aloud
  getReadAloudToggle() {
    return cy.get('#label-read_aloud_toggle');
  }
  clickReadAloudToggle() {
    cy.get('[data-cy=toggle] input').click();
  }

  //Sequence Home Page
  getSequenceActivityTitle() {
    return cy.get('[data-cy=activity-title]');
  }
  getSequenceContent() {
    return cy.get('[data-cy=sequence-page-content]')
  }
  getSequenceTitle() {
    return this.getSequenceContent().find('.sequence-title div');
  }
  getSequenceDescription() {
    return this.getSequenceContent().find('.description');
  }
  getSequenceEstimate() {
    return this.getSequenceContent().find('.estimate');
  }
  getSequenceThumb() {
    return this.getSequenceContent().find('.name div').eq(1);
  }
}
export default ActivityPage;
