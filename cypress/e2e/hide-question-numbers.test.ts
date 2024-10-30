import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Activity hide question numbers checked", () => {
  before(() => {
    cy.visit("?activity=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Factivities%2F311.json&preview");
    activityPage.getActivityTitle().should("contain", "Automation Activity For Hide Question Numbers Checked");
  });
  describe("Hide question numbers checked in activity",() => {
    it("verify question numbers are hidden in activity",()=>{
      activityPage.clickPageItem(0);
      cy.wait(2000);
      activityPage.getInteractive().find(".has-question-number .header div").should("not.exist");
      activityPage.clickPageButton(1);
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("not.contain", "Question #");
      activityPage.clickPageButton(2);
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("not.contain", "Question #");
      activityPage.getHintIcon().should("exist");
      activityPage.clickPageButton(3);
      cy.wait(2000);
      activityPage.getRuntimeContainer()
        .should("exist") // Check the container exists
        .and("not.have.class", "has-question-number"); // Verify it doesn't have the question number class 
      activityPage.clickPageButton(4);
      activityPage.getRuntimeContainer()
        .should("exist")
        .and("have.class", "has-question-number"); // Check it has the question number class
      activityPage.getQuestionHeader()
        .should("contain", "Drawing Tool Name") // Check for the presence of "Drawing Tool Name"
        .and("not.contain", "Question #"); // Ensure it does not contain "Question #"
      // check completion page
      activityPage.clickCompletionPageButton();
      activityPage.getSummaryTableRow().should("contain", "Question 1");
    });
  });
});

context("Activity hide question numbers unchecked", () => {
  before(() => {
    cy.visit("?activity=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Factivities%2F312.json&preview");
    activityPage.getActivityTitle().should("contain", "Automation Activity For Hide Question Numbers Unchecked");
  });
  describe("Hide question numbers unchecked in activity",() => {
    it("verify question numbers are not hidden in activity",()=>{
      activityPage.clickPageItem(0);
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("contain", "Question #");
      activityPage.clickPageButton(1);
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("contain", "Question #");
      activityPage.clickPageButton(2);
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("contain", "Question #");
      activityPage.getHintIcon().should("exist");
      activityPage.clickCompletionPageButton();
      activityPage.getSummaryTableRow().should("contain", "Question 1");
    });
  });
});

context("Sequence hide question numbers checked", () => {
  before(() => {
    cy.visit("?preview&sequence=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Fsequences%2F89.json&sequenceActivity=0");
    activityPage.getSequenceTitle().should("contain", "Automation Sequence For Hide Question Numbers Checked");
  });
  describe("Hide question numbers checked in sequence",() => {
    it("verify question numbers are hidden in sequence",()=>{
      activityPage.clickSequenceThumb(1);
      cy.wait(1000);
      activityPage.getActivityTitle().should("contain", "Automation Activity For Hide Question Numbers Checked");
      activityPage.clickPageItem(0);
      cy.wait(2000);
      activityPage.getInteractive().find(".has-question-number .header div").should("not.exist");
      activityPage.clickPageButton(1);
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("not.contain", "Question #");
      activityPage.getHeaderActivityTitle().click();
      activityPage.clickSequenceThumb(3);
      cy.wait(1000);
      activityPage.getActivityTitle().should("contain", "Automation Activity For Hide Question Numbers Unchecked");
      activityPage.clickPageItem(0);
      cy.wait(2000);
      activityPage.getInteractive().find(".has-question-number .header div").should("not.exist");
      activityPage.clickPageButton(1);
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("not.contain", "Question #");
    });
  });
});

context("Sequence hide question numbers unchecked", () => {
  before(() => {
    cy.visit("?preview&sequence=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Fsequences%2F90.json&sequenceActivity=0");
    activityPage.getSequenceTitle().should("contain", "Automation Sequence For Hide Question Numbers Unchecked");
  });
  describe("Hide question numbers unchecked in sequence",() => {
    it("verify question numbers are not hidden in sequence",()=>{
      activityPage.clickSequenceThumb(1);
      cy.wait(1000);
      activityPage.getActivityTitle().should("contain", "Automation Activity For Hide Question Numbers Checked");
      activityPage.clickPageItem(0);
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("contain", "Question #");
      activityPage.getHeaderActivityTitle().click();
      activityPage.clickSequenceThumb(3);
      cy.wait(1000);
      activityPage.getActivityTitle().should("contain", "Automation Activity For Hide Question Numbers Unchecked");
      activityPage.clickPageItem(0);
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("contain", "Question #");
    });
  });
});

context("Notebook layout hide question numbers checked", () => {
  before(() => {
    cy.visit("?activity=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Factivities%2F313.json&preview");
    activityPage.getActivityTitle().should("contain", "Automation Activity For Hide Question Numbers Checked Notebook Layout");
  });
  describe("Notebook layout hide question numbers checked in activity",() => {
    it("verify question headers are displayed in activity for notebook layout",()=>{
      activityPage.getNavPageButton(0).click();
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("not.contain", "Question #");
      activityPage.getNavPageButton(1).click();
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("not.contain", "Question #");
      activityPage.getNavPageButton(2).click();
      cy.wait(2000);
      activityPage.getQuestionHeader().should("exist");
      activityPage.getQuestionHeader().should("not.contain", "Question #");
      activityPage.clickCompletionPageButton();
      activityPage.getSummaryTableRow().should("contain", "Question 1");
    });
  });
});
