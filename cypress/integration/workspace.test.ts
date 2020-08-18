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

});
