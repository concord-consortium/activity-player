context("Test the overall app", () => {
  before(() => {
    cy.visit("/?preview");
  });

  describe("header",()=>{
    it("verify header loads",()=>{
        cy.get("[data-cy=header]").should("be.visible");
    });
  });
  describe("ActivityNavHeader",()=>{
    it("verify ActivityNavHeader loads",()=>{
        cy.get("[data-cy=activity-nav-header]").should("be.visible");
    });
  });
  describe("ProfileNavHeader",()=>{
    it("verify ProfileNavHeader loads",()=>{
        cy.get("[data-cy=profile-nav-header]").should("be.visible");
        cy.get("[data-cy=profile-nav-header]").should("contain", "Welcome, Anonymous");
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
