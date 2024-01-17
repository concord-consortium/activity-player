import ActivityPage from "../support/elements/activity-page";
import { largeFont, normalFont } from "../support/testdata/font-size_read-alound";

const activityPage = new ActivityPage;

context("Test the overall app", () => {
  before(() => {
    cy.visit("?preview&sequence=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Fsequences%2F13.json&sequenceActivity=0");
    activityPage.getSequenceTitle().should("contain", "Test Sequence Font Size Large");
  });
  describe("Sequence test",() => {
    it("Test Sequence Font Size Large in Sequence",()=>{
      cy.log("verify large font size in sequence home page");
      activityPage.getSequenceActivityTitle().should('have.css', 'font-size', largeFont.size5);
      activityPage.getAccountOwnerName().should('have.css', 'font-size', largeFont.size5);
      activityPage.getSequenceTitle().should('have.css', 'font-size', largeFont.size8);
      activityPage.getSequenceDescription().should('have.css', 'font-size', largeFont.size4);
      activityPage.getSequenceEstimate().should('have.css', 'font-size', largeFont.size5);
      activityPage.getSequenceThumb().should('have.css', 'font-size', largeFont.size9);
      activityPage.getFooterText().should('have.css', 'font-size', largeFont.size5);
      activityPage.getVersionInfo().should('have.css', 'font-size', largeFont.size2);

      cy.log("verify large font size in activity home page");
      activityPage.getSequenceThumb().click();
      activityPage.getActivityTitle().should('have.css', 'font-size', largeFont.size8);
      activityPage.getReadAloudToggle().should('have.css', 'font-size', largeFont.size4);
      activityPage.getIntroText().should('have.css', 'font-size', largeFont.size5);
      activityPage.getEstimatedTime().should('have.css', 'font-size', largeFont.size5);
      activityPage.getPagesHeader().should('have.css', 'font-size', largeFont.size5);
      activityPage.getPageItemNo().should('have.css', 'font-size', largeFont.size5);
      activityPage.getPageItemLink().should('have.css', 'font-size', largeFont.size5);     
    });
  });
});

context("Test the overall app", () => {
  before(() => {
    cy.visit("?preview&sequence=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Fsequences%2F12.json&sequenceActivity=0");
    activityPage.getSequenceTitle().should("contain", "Test Sequence Font Size Normal");
  });
  describe("Sequence test",() => {
    it("Test Sequence Font Size Normal in Sequence",()=>{
      cy.log("verify normal font size in sequence home page");
      activityPage.getSequenceActivityTitle().should('have.css', 'font-size', normalFont.size5);
      activityPage.getAccountOwnerName().should('have.css', 'font-size', normalFont.size5);
      activityPage.getSequenceTitle().should('have.css', 'font-size', normalFont.size8);
      activityPage.getSequenceDescription().should('have.css', 'font-size', normalFont.size4);
      activityPage.getSequenceEstimate().should('have.css', 'font-size', normalFont.size5);
      activityPage.getSequenceThumb().should('have.css', 'font-size', normalFont.size9);
      activityPage.getFooterText().should('have.css', 'font-size', normalFont.size5);
      activityPage.getVersionInfo().should('have.css', 'font-size', normalFont.size2);

      cy.log("verify normal font size in activity home page");
      activityPage.getSequenceThumb().click();
      activityPage.getActivityTitle().should('have.css', 'font-size', normalFont.size8);
      activityPage.getReadAloudToggle().should('have.css', 'font-size', normalFont.size4);
      activityPage.getIntroText().should('have.css', 'font-size', normalFont.size5);
      activityPage.getEstimatedTime().should('have.css', 'font-size', normalFont.size5);
      activityPage.getPagesHeader().should('have.css', 'font-size', normalFont.size5);
      activityPage.getPageItemNo().should('have.css', 'font-size', normalFont.size5);
      activityPage.getPageItemLink().should('have.css', 'font-size', normalFont.size5);    
    });
  });
});
