context("Loading sample activities", () => {
  it("can open one sample activity",() => {
    cy.visit("?activity=sample-activity-1");
    cy.get("[data-cy=activity-summary]").should("contain", "Single Page Test Activity");
  });
  it("can open a different sample activity",() => {
    cy.visit("?activity=sample-activity-multiple-layout-types");
    cy.get("[data-cy=activity-summary]").should("contain", "Sample Layout Types");
  });
});
