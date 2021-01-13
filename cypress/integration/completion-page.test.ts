import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;
const activity1Title = "Question-Interactives Activity Player";
const activity2Title = "Activity Player Copy of LARA Smoke Test v2";

context("Test the overall app", () => {
  before(() => {
    cy.visit("?sequence=sample-sequence-with-questions");
  });
  describe("Test completion page of first activity in a sequence", () => {
    before(() => {
      cy.get("[data-cy=sequence-thumb]").first().click();
      activityPage.getPage(2).click();
    });
    it("test incomplete activity text", () => {
      cy.get(".progress-text").should("contain", `It looks like you haven't quite finished ${activity1Title} yet. The answers you've given have been saved.`);
      cy.get(".progress-container .button").should("contain", "Show All Answers");
      cy.get(".num-complete-text").should("contain", "0 out of 7 questions are answered.");
      cy.get(".completion-text").should("contain", activity2Title);
      cy.get(".next-step .button").should("have.length", 2);
    });
    it("text next activity button loads next activity", () => {
      cy.get(".next-step .button").first().should("contain", "Start Next Activity").click();
      cy.get(".activity-title").should("contain", activity2Title);
    });
  });
  describe("Test completion page of last activity in a sequence", () => {
    before(() => {
      activityPage.getPage(3).click();
    });
    it("test incomplete sequence text", () => {
      cy.get("[data-cy=next-step-text]").should("contain", "You haven't completed the sequence yet. You can go back to complete it, or you can exit.");
    });
    it("test next activity button should not exist and Exit button should return to sequence intro page", () => {
      cy.get(".next-step .button").should("have.length",1).and("contain", "Exit").click();
      cy.get("[data-cy=sequence-page-content]").should("be.visible");
    });
  });
});
