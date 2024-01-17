import ActivityPage from "../support/elements/activity-page";
const activityPage = new ActivityPage;

context("Test the overall app", () => {
  before(() => {
    cy.visit("/?preview");
  });

  describe("workspace",()=>{
    it("verify worspace",()=>{
      cy.log("verify header loads");
      cy.get("[data-cy=activity-header]").should("be.visible");
      cy.get("[data-cy=activity-title]").should("be.visible");
      cy.get("[data-cy=account-owner]").should("be.visible");

      cy.log("verify ActivityNavHeader loads");
      cy.get("[data-cy=activity-nav-header]").should("be.visible");
      cy.get(".page-button").should("have.length", 22); // top and bottom nav headers exist

      cy.log("verify ProfileNavHeader loads");
      cy.get("[data-cy=account-owner]").should("be.visible");
      cy.get("[data-cy=account-owner]").should("contain", "Anonymous");

      cy.log("verify content loads");
      cy.get("[data-cy=intro-page-content]").should("be.visible");

      cy.log("verify footer loads");
      cy.get("[data-cy=footer]").scrollIntoView().should("be.visible");

      cy.log("verify version info loads");
      cy.get("[data-cy=version-info]").scrollIntoView().should("be.visible");

      cy.log("go to correct page when tabbed and keydown enter from page navigation header");
      activityPage.getNavPage(2).type("{enter}");
      activityPage.getSidebarTab().should("be.visible");

      cy.log("go to correct page when tabbed and keydown enter from page list");
      cy.get("[data-cy=nav-pages] button").eq(1).type("{enter}");
      cy.get("[data-cy=intro-page-content]").should("be.visible");
      cy.get(".page-item").eq(1).focus();
      cy.focused().type("{enter}");
      activityPage.getSidebarTab().should("be.visible");
    });
  });
});