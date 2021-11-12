import SequencePage from "../support/elements/sequence-page";
import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;
const sequencePage = new SequencePage;

context("Test sequences", () => {
  describe("test sequence intro page", () => {
    before(() => {
      cy.visit("?sequence=sample-sequence&preview");
      cy.wait(1000);
    });
    it("should load sequence thumbnails", () => {
      sequencePage.getThumbnails().should("have.length", 5);
    });
    it("should navigate to activity when activity thumbnail is selected", () => {
      activityPage.getHeader().should("contain", "Sequence");
      sequencePage.getThumbnails().eq(0).click();
      activityPage.getHeader().should("contain", "Sequence");
      cy.url().should("contain", "sequenceActivity=1");
    });
  });
  describe("test sequence nav", () => {
    before(() => {
      cy.visit("?sequence=sample-sequence&preview");
      cy.wait(1000);
    });
    it("should show the sequence nav menu on an activity page within the sequence", () => {
      sequencePage.getThumbnails().should("have.length", 5);
      sequencePage.getThumbnails().eq(0).click();
      activityPage.getHeader().should("contain", "Sequence");
      cy.get("[data-cy=sequence-nav-header]").should("contain", "Activity");
      cy.get("[data-cy=custom-select-header]").should("contain", "1: Sample Sequence Activity 1");
    });
    it("should allow navigating between activities within the sequence", () => {
      cy.get("[data-cy=custom-select-header]").click();
      cy.get("[data-cy^=list-item-2]").click();
      cy.get("[data-cy=custom-select-header]").should("contain", "2: Sample Sequence Activity 2");
      cy.get("[data-cy=activity-summary]").should("contain", "Sample Sequence Activity 2");
      cy.url().should("contain", "sequenceActivity=2");
      cy.get("[data-cy=custom-select-header]").click();
      cy.get("[data-cy^=list-item-3]").click();
      cy.get("[data-cy=custom-select-header]").should("contain", "3: Sample Sequence Activity 3");
      cy.get("[data-cy=activity-summary]").should("contain", "Sample Sequence Activity 3");
      cy.url().should("contain", "sequenceActivity=3");
      cy.get("[data-cy=custom-select-header]").click();
      cy.get("[data-cy^=list-item-1]").click();
      cy.get("[data-cy=custom-select-header]").should("contain", "1: Sample Sequence Activity 1");
      cy.get("[data-cy=activity-summary]").should("contain", "Sample Sequence Activity 1");
      cy.url().should("contain", "sequenceActivity=1");
    });
    it("should always take you to the index page of an activity when navigating to another activity within the sequence", () => {
      cy.get("[data-cy=custom-select-header]").click();
      cy.get("[data-cy^=list-item-2]").click();
      cy.get("[data-cy=custom-select-header]").should("contain", "2: Sample Sequence Activity 2");
      cy.get("[data-cy=activity-page-links] .page-item").eq(0).click();
      cy.get("[data-cy=custom-select-header]").click();
      cy.get("[data-cy^=list-item-3]").click();
      cy.get("[data-cy=custom-select-header]").should("contain", "3: Sample Sequence Activity 3");
      cy.get("[data-cy=activity-summary]").should("exist");
      cy.get("[data-cy=activity-summary]").should("contain", "Sample Sequence Activity 3");
    });
  });
});
