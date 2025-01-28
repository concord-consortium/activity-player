import ActivityPage from "../support/elements/activity-page";
import CompletionPage from "../support/elements/completion-page";

const activityPage = new ActivityPage;
const completionPage = new CompletionPage;
// const activity1Title = "Question-Interactives Activity Player";
const activity2Title = "Activity Player Copy of LARA Smoke Test v2";

context("Test the overall app", () => {
  beforeEach(() => {
    cy.visit("?sequence=sample-sequence-with-questions");
  });
  describe("Test completion page of first activity in a sequence", () => {
    beforeEach(() => {
      cy.get("[data-cy=sequence-thumb]").first().click();
      activityPage.getPage(2).click();
    });
    it("test completion page", () => {
      cy.log("test incomplete activity text");
      completionPage.getProgressText().should("contain", `It looks like you haven't quite finished this activity yet.`);
      cy.get(".preview-title-container").should("contain", activity2Title);
      completionPage.getNextActivityButtons().first().should("contain", "Start Next Activity");
      completionPage.getNextActivityButtons().last().should("contain", "Exit");
      completionPage.getSummaryTable().should("have.length", 1);
      completionPage.getSummaryTableRows().should("have.length", 7);
      completionPage.getSummaryTableRows().eq(0).find("svg").should("have.class", "incomplete");

      cy.log("test next activity button loads next activity");
      completionPage.getNextActivityButtons().find("button").first().click();
      cy.get(".activity-title").should("contain", activity2Title);

      cy.log("Test completion page of last activity in a sequence");
      activityPage.getPage(3).click();

      cy.log("test incomplete sequence text");
      completionPage.getProgressText().should("contain", "It looks like you haven't quite finished this activity yet.");

      cy.log("test next activity button should not exist and Exit button should return to sequence intro page");
      cy.get(".next-step").should("not.exist");
      completionPage.getExitButton().should("have.length", 1).and("contain", "Exit").click();
      cy.get("[data-cy=sequence-page-content]").should("be.visible");
    });
    it("test completion page question links", () => {
      completionPage.getQuestionLinks().should("have.length", 7);
      cy.log("Test clicking first question link loads page containing first question and brings it into view.");
      completionPage.getQuestionLinks().eq(0).click();
      activityPage.getInteractive().eq(0).should("be.visible")
        .find("iframe").invoke("attr", "id").should("eq", "650-ManagedInteractive");
      activityPage.getCompletionPage().first().click();
      cy.log("Test clicking last question link loads page containing last question and brings it into view.");
      completionPage.getQuestionLinks().should("have.length", 7);
      completionPage.getQuestionLinks().eq(6).click();
      activityPage.getInteractive().eq(6).should("be.visible")
        .find("iframe").invoke("attr", "id").should("eq", "668-ManagedInteractive");
    });
  });
});
