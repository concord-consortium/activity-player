import ActivityPage from "../support/elements/activity-page";
const activityPage = new ActivityPage;

context("Test the overall app", () => {
  before(() => {
    cy.visit("/?preview");
  });

  describe("header",()=>{
    it("verify header loads",()=>{
        cy.get("[data-cy=activity-header]").should("be.visible");
        cy.get("[data-cy=activity-title]").should("be.visible");
        cy.get(".header-center .custom-select").should("be.visible");
        cy.get("[data-cy=account-owner]").should("be.visible");
    });
  });
  describe("ActivityNavHeader",()=>{
    it("verify ActivityNavHeader loads",()=>{
        cy.get("[data-cy=activity-nav-header]").should("be.visible");
        cy.get(".paginate-container").should("be.visible");
        cy.get(".page-button").should("have.length", 11);
    });
  });
  describe("ProfileNavHeader",()=>{
    it("verify ProfileNavHeader loads",()=>{
        cy.get("[data-cy=account-owner]").should("be.visible");
        cy.get("[data-cy=account-owner]").should("contain", "Anonymous");
    });
  });
  describe("content",()=>{
    it("verify content loads",()=>{
        cy.get("[data-cy=intro-page-content]").should("be.visible");
    });
  });
  describe("footer",()=>{
      it("verify footer loads",()=>{
          cy.get("[data-cy=footer]").scrollIntoView().should("be.visible");
      });
  });
  describe("accessibility",()=>{
    it("go to correct page when tabbed and keydown enter from page navigation header",()=>{
      activityPage.getNavPage(2).type("{enter}");
      activityPage.getSidebarTab().should("be.visible");
    });
    it("go to correct page when tabbed and keydown enter from page list",()=>{
      cy.get("[data-cy=nav-pages] button").eq(0).type("{enter}");
      cy.get("[data-cy=intro-page-content]").should("be.visible");
      cy.get(".page-item .page-link").contains("Page 2").focus();
      cy.focused().type("{enter}");
      activityPage.getSidebarTab().should("be.visible");
    });
  });
});
