import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;
// const activity1Title = "Question-Interactives Activity Player";
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
      cy.get(".progress-text").should("contain", `It looks like you haven't quite finished this activity yet.`);
      cy.get(".exit-container .show-my-work").should("contain", "Show My Work");
      cy.get(".next-step-text").should("contain", activity2Title);
      cy.get(".next-step button").should("have.length", 2);
      cy.get("[data-cy=summary-table]").should("have.length", 1);
      cy.get("[data-cy=summary-table-row]").should("have.length", 7);
      cy.get("[data-cy=summary-table-row]").eq(0).find("svg").should("have.class", "incomplete");
    });
    it("test next activity button loads next activity", () => {
      cy.get(".next-step button").first().should("contain", "Start Next Activity").click();
      cy.get(".activity-title").should("contain", activity2Title);
    });
  });
  describe("Test completion page of last activity in a sequence", () => {
    before(() => {
      activityPage.getPage(3).click();
    });
    it("test incomplete sequence text", () => {
      cy.get("[data-cy=progress-text]").should("contain", "It looks like you haven't quite finished this activity yet.");
    });
    it("test next activity button should not exist and Exit button should return to sequence intro page", () => {
      cy.get(".next-step").should("not.exist");
      cy.get(".exit-container .textButton").should("have.length", 1).and("contain", "Exit").click();
      cy.get("[data-cy=sequence-page-content]").should("be.visible");
    });
  });
});
