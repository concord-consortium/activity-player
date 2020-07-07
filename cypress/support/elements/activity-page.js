class ActivityPage {
  getPage(num) {
    return cy.get("[data-cy=activity-page-links]").contains(num);
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
  getSecondaryEmbeddable(type) { 
    //types=["image-question","text-box","multiple-choice-question","open-response-question", 
    //      "labbook-question", "iframe-interactive-question","image-video-interactive", ]
    return cy.get("[data-cy="+type+"]");
  }
}
export default ActivityPage;
