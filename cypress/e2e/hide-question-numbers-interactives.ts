import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Activity hide question numbers checked", () => {
  before(() => {
    cy.visit("?activity=sample-activity-hide-question-number");
    activityPage.getActivityTitle().should("contain", "Test Hide Question Number Setting");
  });
  describe("Hide question numbers checked in activity",() => {
    it("Verifies combinations of hide question number option, name, and hint",()=>{
      // Visit Page 1 of activity
      activityPage.clickPageItem(0);
      cy.wait(2000);
      // Check that "Library Interactives" exists within the page 1 content
      activityPage.getPageContent()
      .should("exist")
      .and("contain.text", "Library Interactives");

      // Page 1: Top Left - Question #1: Name and no hint
      cy.log("Page 1: Top Left - Question #1: Name and no hint");
      activityPage.getInteractive().eq(0).find(".has-question-number .header div")
        .should("exist")
        .and("have.text", "Question #1: Name and no hint"); // Check for specific text "Question #1: Name and no hint"
      activityPage.getInteractive().eq(0).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });

      // Page 1: Top Right - Name and no hint
      cy.log("Page 1: Top Right - Name and no hint");
      activityPage.getInteractive().eq(4).find(".header div")
        .should("exist")
        .and("have.text", "Name and no hint"); // Check for specific text "Name and no hint"
      activityPage.getInteractive().eq(4).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });

      // Page 1: Row 2 Left - Question #2: Name and hint
      cy.log("Page 1: Row 2 Left - Question #2: Name and hint");
      activityPage.getInteractive().eq(1).find(".has-question-number .header div")
        .should("exist")
        .and("contain.text", "Question #2: Name and hint"); // Check for "Question #2" and name
      activityPage.getInteractive().eq(1).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 1: Row 2 Right - Name and hint
      cy.log("Page 1: Row 2 Right - Name and hint");
      activityPage.getInteractive().eq(5).find(".header div")
        .should("exist")
        .and("contain.text", "Name and hint"); // Check for specific text "Name and hint"
      activityPage.getInteractive().eq(5).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 1: Row 3 Left - Question #3: No name and hint
      cy.log("Page 1: Row 3 Left - Question #3: No name and hint");
      activityPage.getInteractive().eq(2).find(".has-question-number .header div")
        .should("exist")
        .and("contain.text", "Question #3"); // Check for Header with question number
      activityPage.getInteractive().eq(2).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 1: Row 3 Right - No name and hint
      cy.log("Page 1: Row 3 Right - No name and hint");
      activityPage.getInteractive().eq(6).find(".has-question-number .header div")
        .should("not.exist");
      activityPage.getInteractive().eq(6).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 1: Bottom Row Left - Question #4: No name, no hint
      cy.log("Page 1: Bottom Row Left - Question #4: No name, no hint");
      activityPage.getInteractive().eq(3).find(".has-question-number .header div")
        .should("exist")
        .and("contain.text", "Question #4"); // Check for question # without name
      activityPage.getInteractive().eq(3).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });

      // Page 1: Bottom Right - No header, no hint
      cy.log("Page 1: Bottom Right: No header, no hint");
      activityPage.getInteractive().eq(7).find(".has-question-number .header div")
        .should("not.exist"); // Check for no header
      activityPage.getInteractive().eq(7).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });

      // Visit Page 2 of activity
      activityPage.clickPageButton(1);
      cy.wait(2000);
      activityPage.getPageContent()
      .should("exist")
      .and("contain.text", "Interactives That Save State");

      // Page 2: Top Left - Question #5: Name and no hint
      cy.log("Page 2: Top Left - Question #5: Name and no hint");
      activityPage.getInteractive().eq(0).find(".has-question-number .header div")
        .should("exist")
        .and("have.text", "Question #5: Name and no hint"); // Check for specific text "Question #5: Name and no hint"
      activityPage.getInteractive().eq(0).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });

      // Page 2: Top Right - Name and no hint
      cy.log("Page 2: Top Right - Name and no hint");
      activityPage.getInteractive().eq(4).find(".header div")
        .should("exist")
        .and("have.text", "Name and no hint"); // Check for specific text "Name and no hint"
      activityPage.getInteractive().eq(4).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });

      // Page 2: Row 2 Left - Question #6: Name and hint
      cy.log("Page 2: Row 2 Left - Question #6: Name and hint");
      activityPage.getInteractive().eq(1).find(".has-question-number .header div")
        .should("exist")
        .and("contain.text", "Question #6: Name and hint"); // Check for "Question #2" and name
      activityPage.getInteractive().eq(1).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 2: Row 2 Right - Name and hint
      cy.log("Page 2: Row 2 Right - Name and hint");
      activityPage.getInteractive().eq(5).find(".header div")
        .should("exist")
        .and("contain.text", "Name and hint"); // Check for specific text "Name and hint"
      activityPage.getInteractive().eq(5).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 2: Row 3 Left - Question #7: No name and hint
      cy.log("Page 2: Row 3 Left - Question #7: No name and hint");
      activityPage.getInteractive().eq(2).find(".has-question-number .header div")
        .should("exist")
        .and("contain.text", "Question #7"); // Check for Header with question number
      activityPage.getInteractive().eq(2).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 2: Row 3 Right - No name and hint
      cy.log("Page 2: Row 3 Right - No name and hint");
      activityPage.getInteractive().eq(6).find(".has-question-number .header div")
        .should("not.exist");
      activityPage.getInteractive().eq(6).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 2: Bottom Row Left - Question #8: No name, no hint
      cy.log("Page 2: Bottom Row Left - Question #8: No name, no hint");
      activityPage.getInteractive().eq(3).find(".has-question-number .header div")
        .should("exist")
        .and("contain.text", "Question #8"); // Check for question # without name
      activityPage.getInteractive().eq(3).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });

      // Page 2: Bottom Right - No header, no hint
      cy.log("Page 2: Bottom Right: No header, no hint");
      activityPage.getInteractive().eq(7).find(".has-question-number .header div")
        .should("not.exist"); // Check for no header
      activityPage.getInteractive().eq(7).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });

      // Visit Page 3 of activity
      activityPage.clickPageButton(2);
      cy.wait(2000);
      activityPage.getPageContent()
        .should("exist")
        .and("contain.text", "Interactives That DO NOT Save State");

      // Page 3: Top Left - Name and no hint
      cy.log("Page 3: Top Left - Name and no hint");
      activityPage.getInteractive().eq(0).find(".header div")
      .should("exist")
      .and("have.text", "Name and no hint"); // Check for specific text "Name and no hint"
      activityPage.getInteractive().eq(0).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });

      // Page 3: Top Right - Name and no hint
      cy.log("Page 3: Top Right - Name and no hint");
      activityPage.getInteractive().eq(4).find(".header div")
        .should("exist")
        .and("have.text", "Name and no hint"); // Check for specific text "Name and no hint"
      activityPage.getInteractive().eq(4).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });

      // Page 3: Row 2 Left - Name and hint
      cy.log("Page 3: Row 2 Left - Name and hint");
      activityPage.getInteractive().eq(1).find(".header div")
      .should("exist")
      .and("have.text", "Name and hint"); // Check for specific text "Name and hint"
      activityPage.getInteractive().eq(1).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 3: Row 2 Right - Name and hint
      cy.log("Page 3: Row 2 Right - Name and hint");
      activityPage.getInteractive().eq(5).find(".header div")
        .should("exist")
        .and("contain.text", "Name and hint"); // Check for specific text "Name and hint"
      activityPage.getInteractive().eq(5).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 3: Row 3 Left - No name and hint
      cy.log("Page 2: Row 3 Left - No name and hint");
      activityPage.getInteractive().eq(2).find(".header div")
      .should("exist")
      .and("not.have.text"); // Check for no text
      activityPage.getInteractive().eq(2).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 3: Row 3 Right - No name and hint
      cy.log("Page 3: Row 3 Right - No name and hint");
      activityPage.getInteractive().eq(6).find(".has-question-number .header div")
        .should("not.exist"); // No name expected
      activityPage.getInteractive().eq(6).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("exist"); // Hint icon expected
      });

      // Page 3: Bottom Row Left - No name no hint
      cy.log("Page 3: Bottom Row Left - No name, no hint");
      activityPage.getInteractive().eq(3).find(".has-question-number .header div")
        .should("not.exist"); // No name expected
      activityPage.getInteractive().eq(3).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });

      // Page 2: Bottom Right - No header, no hint
      cy.log("Page 3: Bottom Right: No header, no hint");
      activityPage.getInteractive().eq(3).find(".has-question-number .header div")
        .should("not.exist"); // No name expected
      activityPage.getInteractive().eq(3).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should("not.exist"); // No hint icon expected
      });
    });
  });
});
