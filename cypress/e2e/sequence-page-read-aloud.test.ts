import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Test the overall app", () => {
  before(() => {
    cy.visit("?preview&sequence=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Fsequences%2F19.json&sequenceActivity=0");
    activityPage.getSequenceTitle().should("contain", "Automation Sequence AP Read Aloud Enabled");
  });
  describe("Sequence Home Page",() => {
    it("verify read aloud toggle displayed",()=>{
      cy.log("verify read aloud toggle is displayed in sequence home page");
      activityPage.getReadAloudToggle().should("exist");

      cy.log("verify read aloud toggle is displayed in home page");
      activityPage.getSequenceThumb().click();
      activityPage.getActivityTitle().should("contain", "AP Read Aloud Activity Disabled");
      activityPage.getReadAloudToggle().should("exist");
    });
  });
});

context("Test the overall app", () => {
  before(() => {
    cy.visit("?preview&sequence=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Fsequences%2F20.json&sequenceActivity=0");
    activityPage.getSequenceTitle().should("contain", "Automation Sequence AP Read Aloud Disabled");
  });
  describe("Sequence Home Page",() => {
    it("verify read aloud toggle is not displayed",()=>{
      cy.log("verify read aloud toggle is not displayed in sequence home page");
      activityPage.getReadAloudToggle().should("not.exist");

      cy.log("verify read aloud toggle is not displayed in home page");
      activityPage.getSequenceThumb().click();
      activityPage.getActivityTitle().should("contain", "AP Read Aloud Activity");
      activityPage.getReadAloudToggle().should("not.exist");     
    });
  });
});
