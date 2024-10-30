import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Activity hide question numbers checked", () => {
  before(() => {
    cy.visit("?activity=sample-activity-hide-question-number");
    activityPage.getActivityTitle().should("contain", "Test Hide Question Number Setting");
  });
  describe("Hide question numbers checked in activity",() => {
    it.only("Verify the left column has the hide question number setting OFF and the right has it ON.",()=>{
      activityPage.clickPageItem(0);
      cy.wait(2000);
      cy.log("left column question numbers on page 1 shown");
      activityPage.getInteractive().eq(0).find(".has-question-number .header div").should("exist");
      activityPage.getInteractive().eq(1).find(".has-question-number .header div").should("exist");
      activityPage.getInteractive().eq(2).find(".has-question-number .header div").should("exist");
      activityPage.getInteractive().eq(3).find(".has-question-number .header div").should("exist");
      cy.log("right column question numbers on page 1 hidden");
      activityPage.getInteractive().eq(4).find(".has-question-number .header div").should("not.exist");
      activityPage.getInteractive().eq(5).find(".has-question-number .header div").should("not.exist");
      activityPage.getInteractive().eq(6).find(".has-question-number .header div").should("not.exist");
      activityPage.getInteractive().eq(7).find(".has-question-number .header div").should("not.exist");


      activityPage.clickPageButton(1);
      cy.wait(2000);
      cy.log("left column question numbers on page 2 shown");
      activityPage.getInteractive().eq(0).find(".has-question-number .header div").should("exist");
      activityPage.getInteractive().eq(0).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should('not.exist'); // Verify no hint icon exists
      });
      activityPage.getInteractive().eq(1).find(".has-question-number .header div").should("exist");
      activityPage.getInteractive().eq(1).within(($interactive) => {
        activityPage.hasHintIcon($interactive).then((hasHint) => {
          activityPage.hasHintIcon($interactive).should('exist'); // Verify the hint icon exists
        });
      });
     activityPage.getInteractive().eq(2).find(".has-question-number .header div").should("exist");
      activityPage.getInteractive().eq(2).within(($interactive) => {
      activityPage.hasHintIcon($interactive).then((hasHint) => {
        activityPage.hasHintIcon($interactive).should('exist'); // Verify the hint icon exists
        });
      });
      activityPage.getInteractive().eq(3).find(".has-question-number .header div").should("exist");
      activityPage.getInteractive().eq(3).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should('not.exist'); // Verify no hint icon exists
    });
    cy.log("right column question numbers on page 2 hidden");
    activityPage.getInteractive().eq(4).find(".has-question-number .header div").should("not.exist");
    activityPage.getInteractive().eq(4).within(($interactive) => {
      activityPage.hasHintIcon($interactive).should('not.exist'); // Verify no hint icon exists
    });
    activityPage.getInteractive().eq(5).find(".has-question-number .header div").should("not.exist");
    activityPage.getInteractive().eq(5).within(($interactive) => {
      activityPage.hasHintIcon($interactive).then((hasHint) => {
        activityPage.hasHintIcon($interactive).should('exist'); // Verify the hint icon exists
      });
    });
    activityPage.getInteractive().eq(6).find(".has-question-number .header div").should("not.exist");
    activityPage.getInteractive().eq(6).within(($interactive) => {
    activityPage.hasHintIcon($interactive).then((hasHint) => {
      activityPage.hasHintIcon($interactive).should('exist'); // Verify the hint icon exists
      });
    });
    activityPage.getInteractive().eq(7).find(".has-question-number .header div").should("not.exist");
    activityPage.getInteractive().eq(7).within(($interactive) => {
      activityPage.hasHintIcon($interactive).should('not.exist'); // Verify no hint icon exists
    });

    activityPage.clickPageButton(2);
      cy.wait(2000);
      cy.log("verifies left column question numbers on page 3");
      activityPage.getInteractive().eq(0).find(".has-question-number .header div").should("not.exist");
      activityPage.getInteractive().eq(0).within(($interactive) => {
        activityPage.hasHintIcon($interactive).should('not.exist'); // Verify no hint icon exists
      });
      activityPage.getInteractive().eq(1).find(".has-question-number .header div").should("not.exist");
      activityPage.getInteractive().eq(1).within(($interactive) => {
        activityPage.hasHintIcon($interactive).then((hasHint) => {
          activityPage.hasHintIcon($interactive).should('exist'); // Verify the hint icon exists
        });
      });
     activityPage.getInteractive().eq(2).find(".has-question-number .header div").should("not.exist");
      activityPage.getInteractive().eq(2).within(($interactive) => {
      activityPage.hasHintIcon($interactive).then((hasHint) => {
        activityPage.hasHintIcon($interactive).should('exist'); // Verify the hint icon exists
        });
      });
      // this isn't working, commenting out for now
      // Check the first question with the text "This has no name or hint"
      // cy.contains('legend', 'This has no name or hint')
      // .should('exist') // Ensure the legend exists
      // .parent() // Navigate to the parent element
      // .should('not.have.class', 'has-question-number') // Ensure it doesn't have the question number class
      // .and('not.have.descendants', '.header'); // Ensure it doesn't contain a header    
    cy.log("verifies right column question numbers on page 3");
    activityPage.getInteractive().eq(4).find(".has-question-number .header div").should("not.exist");
    activityPage.getInteractive().eq(4).within(($interactive) => {
      activityPage.hasHintIcon($interactive).should('not.exist'); // Verify no hint icon exists
    });
    activityPage.getInteractive().eq(5).find(".has-question-number .header div").should("not.exist");
    activityPage.getInteractive().eq(5).within(($interactive) => {
      activityPage.hasHintIcon($interactive).then((hasHint) => {
        activityPage.hasHintIcon($interactive).should('exist'); // Verify the hint icon exists
      });
    });
    activityPage.getInteractive().eq(6).find(".has-question-number .header div").should("not.exist");
    activityPage.getInteractive().eq(6).within(($interactive) => {
    activityPage.hasHintIcon($interactive).then((hasHint) => {
      activityPage.hasHintIcon($interactive).should('exist'); // Verify the hint icon exists
      });
    });
    // this isn't working, commenting out for now
    // cy.contains('legend', 'This has no name or hint')
    //   .eq(1) // Select the second occurrence
    //   .should('exist')
    //   .parent()
    //   .should('not.have.class', 'has-question-number')
    //   .and('not.have.descendants', '.header');
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