import ActivityPage from "../support/elements/activity-page";
import { getInIframe, getInIframeWithIndex } from "../support/elements/iframe";
import ReadAloud from "../support/elements/read-aloud";
import Notebook from "../support/elements/notebook";

const activityPage = new ActivityPage;
const readAloud = new ReadAloud;
const fontFamily = "Andika";
const noteBook = new Notebook;

function beforeTest() {
  cy.visit("?activity=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Factivities%2F183.json&preview");
  activityPage.getActivityTitle().should("contain", "Automation Activity For Notebook Layout");
}

context("Test the overall app", () => {
  describe("Home Page",() => {
    it("verify home page in notebook layout",()=>{
      beforeTest();
      activityPage.getPreviousPageButton().should("not.exist");
      activityPage.getNextPageButton().should("not.exist");
      activityPage.getActivityNavHeader().eq(0).should("exist");
      activityPage.getActivityNavHeader().eq(1).should("not.exist");
      activityPage.getHomeButton().should("contain", "Home");
      activityPage.getNavPageButton(0).should("contain", "Page 1");
      activityPage.getNavPageButton(1).should("contain", "Page 2");
      noteBook.verifyNotebookHeaderNotDisplayed();
      activityPage.getHeaderActivityTitle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getActivityTitle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getReadAloudToggle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getIntroText().invoke("css", "font-family").should("contain", fontFamily);
    });
  });
  describe("Page 1: Multiple Tabs",() => {
    it("verify page 1 with multiple tabs",()=>{
      beforeTest();
      activityPage.getNavPageButton(0).click();
      cy.wait(5000);
      noteBook.getNotebookHeader().should("exist");
      noteBook.getSectionTab(0).should("contain", "Tab 1");
      noteBook.getSectionTab(1).should("contain", "Tab 2");
      noteBook.getSectionTab(2).should("contain", "Tab 3");
      noteBook.getSeparator().should("exist");
      noteBook.getSectionTab(0).invoke("attr", "class").should("contains", "selected");
      getInIframeWithIndex("body", ".base-app--runtime--question-int p", 0).invoke("css", "font-family").should("contain", fontFamily);
      getInIframeWithIndex("body", "[data-cy=choices-container]", 0).invoke("css", "font-family").should("contain", fontFamily);
      getInIframeWithIndex("body", "[data-cy=choices-container] .radio-choice input", 0).eq(0).click();
      noteBook.getSectionTab(1).click();
      cy.wait(5000);
      noteBook.getSectionTab(1).invoke("attr", "class").should("contains", "selected");
      getInIframeWithIndex("body", ".base-app--runtime--question-int p", 1).invoke("css", "font-family").should("contain", fontFamily);
      getInIframeWithIndex("body", "[data-testid=response-textarea]", 1).invoke("css", "font-family").should("contain", fontFamily);
      getInIframeWithIndex("body", "[data-testid=response-textarea]", 1).type("Text Response");
      getInIframeWithIndex("body", "[data-testid=response-textarea]", 1).invoke("css", "font-family").should("contain", fontFamily);
      noteBook.getSectionTab(2).click();
      cy.wait(5000);
      noteBook.getSectionTab(2).invoke("attr", "class").should("contains", "selected");
      activityPage.getTextBlockName().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getTextBlockContent().invoke("css", "font-family").should("contain", fontFamily);
    });
  });
  describe("Page 2: No Tabs",() => {
    it("verify page 2 with no tab",()=>{
      beforeTest();
      activityPage.getNavPageButton(1).click();
      cy.wait(5000);
      noteBook.getNotebookHeader().should("exist");
      noteBook.verifySectionTabNotDisplayed();
      noteBook.verifySeparatorNotDisplayed();
      activityPage.getTextBlockName().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getTextBlockContent().invoke("css", "font-family").should("contain", fontFamily);
    });
  });
  describe("Summary Page",() => {
    it("verify summary page",()=>{
      beforeTest();
      activityPage.clickCompletionPageButton();
      cy.wait(2000);
      noteBook.verifyNotebookHeaderNotDisplayed();
      noteBook.verifySectionTabNotDisplayed();
      noteBook.verifySeparatorNotDisplayed();
      activityPage.getProgressText().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getSummaryActivityTitle().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getSummaryTableHead().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getSummaryTableRow().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getOrText().invoke("css", "font-family").should("contain", fontFamily);
      activityPage.getExitTextButton().invoke("css", "font-family").should("contain", fontFamily);
    });
  });
});
