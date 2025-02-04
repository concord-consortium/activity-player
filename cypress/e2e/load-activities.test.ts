import ActivityPage from "../support/elements/activity-page";
const activityPage = new ActivityPage;

context("Loading activities", () => {

  describe("Loading sample activities", () => {
    it("can open one sample activity", () => {
      cy.visit("?activity=sample-activity-1&preview");
      cy.get("[data-cy=activity-summary]").should("contain", "Single Page Test Activity");
    });

    it("can open a different sample activity", () => {
      cy.visit("?activity=sample-activity-multiple-layout-types&preview");
      cy.get("[data-cy=activity-summary]").should("contain", "Sample Layout Types");
    });
  });

  describe("Loading pages", () => {
    it("can open the introduction page by default", () => {
      cy.visit("?activity=sample-activity-1&preview");
      cy.get("[data-cy=activity-summary]").should("contain", "Single Page Test Activity");
    });

    it("can load page 0", () => {
      cy.visit("?activity=sample-activity-multiple-layout-types&page=0&preview");
      cy.get("[data-cy=activity-summary]").should("contain", "Sample Layout Types");
    });

    it("can load page 4", () => {
      cy.visit("?activity=sample-activity-multiple-layout-types&page=4&preview");
      activityPage.getSecondaryEmbeddable("text-box").eq(1).scrollIntoView()
        .should("be.visible").and("contain","Duis vitae ultrices augue, eu fermentum elit.");
    });

    it("can load the completion page when `showFeedback` query param is set", () => {
      cy.visit("?activity=sample-activity-1&preview");
      cy.get("[data-cy=completion-page-content]").should("not.exist");
      cy.visit("?activity=sample-activity-1&showFeedback&preview");
      cy.get("[data-cy=completion-page-content]").should("be.visible");
    });
  });
});
