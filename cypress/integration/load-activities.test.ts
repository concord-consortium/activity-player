import ActivityPage from "../support/elements/activity-page";
const activityPage = new ActivityPage;

context("Loading activities", () => {

  describe("Loading sample activities", () => {
    it("can open one sample activity", () => {
      cy.visit("?activity=sample-activity-1");
      cy.get("[data-cy=activity-summary]").should("contain", "Single Page Test Activity");
    });

    it("can open a different sample activity", () => {
      cy.visit("?activity=sample-activity-multiple-layout-types");
      cy.get("[data-cy=activity-summary]").should("contain", "Sample Layout Types");
    });
  });

  describe("Loading pages", () => {
    it("can open the introduction page by default", () => {
      cy.visit("?activity=sample-activity-1");
      cy.get("[data-cy=activity-summary]").should("contain", "Single Page Test Activity");
    });

    it("can load page 0", () => {
      cy.visit("?activity=sample-activity-multiple-layout-types&page=0");
      cy.get("[data-cy=activity-summary]").should("contain", "Sample Layout Types");
    });

    it("can load page 3", () => {
      cy.visit("?activity=sample-activity-multiple-layout-types&page=3");
      activityPage.getSecondaryEmbeddable("text-box").scrollIntoView()
        .should("be.visible").and("contain","Duis vitae ultrices augue, eu fermentum elit.");
    });
  });
});
