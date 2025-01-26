import ActivityPage from "../support/elements/activity-page";
import { getInIframe, getInIframeWithIndex } from "../support/elements/iframe";
import { largeFont } from "../support/testdata/font-size_read-alound";
import FontSize from "../support/elements/font-size";

const activityPage = new ActivityPage;
const fontSize = new FontSize;

function beforeTest() {
  cy.visit("?activity=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Factivities%2F91.json&preview");
  activityPage.getActivityTitle().should("contain", "Automation Activity For Font Size Large");
}

context("Test the overall app", () => {
  describe("Home Page, Header and Footer",() => {
    it("verify large font size in home page, header and footer",()=>{
      beforeTest();
      activityPage.getHeaderActivityTitle().should('have.css', 'font-size', largeFont.size5);
      activityPage.getAccountOwnerName().should('have.css', 'font-size', largeFont.size5);
      activityPage.getPageButton().should('have.css', 'font-size', largeFont.size5);
      activityPage.getFooterText().should('have.css', 'font-size', largeFont.size5);
      activityPage.getVersionInfo().should('have.css', 'font-size', largeFont.size2);

      cy.log("verify large font size in home page");
      activityPage.getActivityTitle().should('have.css', 'font-size', largeFont.size8);
      activityPage.getReadAloudToggle().should('have.css', 'font-size', largeFont.size4);
      activityPage.getIntroText().should('have.css', 'font-size', largeFont.size5);
      activityPage.getEstimatedTime().should('have.css', 'font-size', largeFont.size5);
      activityPage.getPagesHeader().should('have.css', 'font-size', largeFont.size5);
      activityPage.getPageItemNo().should('have.css', 'font-size', largeFont.size5);
      activityPage.getPageItemLink().should('have.css', 'font-size', largeFont.size5);

    });
  });
  describe("Bar Graph",() => {
    it("verify large font size in bar graph interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(0);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("Bar Graph", "Bar Graph");
      getInIframe("body", ".base-app--runtime--question-int p").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-cy=title] div").should('have.css', 'font-size', largeFont.size7);
      getInIframe("body", "[data-cy=yAxisLabel] div").should('have.css', 'font-size', largeFont.size6);
      getInIframe("body", "[data-cy=xAxisLabel] div").should('have.css', 'font-size', largeFont.size6);
    });
  });
  describe("Carousel",() => {
    it("verify large font size in carousel interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(1);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("Carousel", "Carousel");
      getInIframe("body", ".runtime--runtime--question-int p").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".runtime--runtime--question-int").find("iframe").its("0.contentDocument.body").find('[data-testid=legend]').should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".runtime--runtime--question-int").find("iframe").its("0.contentDocument.body").find('[data-testid=response-textarea]').should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".iframe-runtime--hint--question-int p").should('have.css', 'font-size', largeFont.size3);
    });
  });
  describe("Drag & Drop",() => {
    it("verify large font size in drag & drop interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(2);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("Drag & Drop", "Drag and drop");
      getInIframe("body", ".base-app--runtime--question-int p").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".container--prompt--question-int div").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".draggable-item-wrapper--itemLabel--question-int div").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".drop-zone-wrapper--targetLabel--question-int div").should('have.css', 'font-size', largeFont.size4);
    });
  });
  describe("Drawing Tool",() => {
    it("verify large font size in drawing tool interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(3);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("Drawing Tool", "Drawing Tool");
      getInIframe("body", ".base-app--runtime--question-int p").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-test=upload-btn]").should('have.css', 'font-size', largeFont.size4);
      getInIframeWithIndex("body", "[data-testid=snapshot-btn]", 1).should('have.css', 'font-size', largeFont.size4);
    });
  });
  describe("FIB",() => {
    it("verify large font size in fill in the blanks interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(4);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("FIB", "FIB");
      getInIframe("body", ".base-app--runtime--question-int p").should('have.css', 'font-size', largeFont.size4);
    });
  });
  describe("Image Interactive",() => {
    it("verify large font size in image interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(5);
      cy.wait(5000);
      activityPage.verifyPageContentHeader("Image Interactive");
      activityPage.getPageContentHeader().should('have.css', 'font-size', largeFont.size7);
      getInIframe("body", ".runtime--caption--question-int").should('have.css', 'font-size', largeFont.size1);
      getInIframe("body", ".runtime--credit--question-int").should('have.css', 'font-size', largeFont.size1);
      getInIframe("body", ".runtime--creditLink--question-int").should('have.css', 'font-size', largeFont.size1);
    });
  });
  describe("Image Question",() => {
    it("verify large font size in image question interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(6);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("Image Question", "Image Question");
      getInIframe("body", ".base-app--runtime--question-int p").eq(0).should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".base-app--runtime--question-int p").eq(1).should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-test=edit-btn]").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-test=edit-btn]").click();
      /*

      DISABLED DUE TO ERROR ON GITHUB - WORKS FINE LOCALLY.  SHOULD BE FIXED WHEN AP IS WORKED ON NEXT.

      cy.wait(5000);
      getInIframeWithIndex("body", ".drawing-tool-dialog--dialogContent--question-int", 2).should("be.visible");
      getInIframeWithIndex("body", ".drawing-tool-dialog--dialogRightPanel--question-int div p", 2).eq(0).should('have.css', 'font-size', largeFont.size4);
      getInIframeWithIndex("body", ".drawing-tool-dialog--answerPrompt--question-int p", 2).should('have.css', 'font-size', largeFont.size4);
      getInIframeWithIndex("body", ".drawing-tool-dialog--dialogRightPanel--question-int textarea", 2).should('have.css', 'font-size', largeFont.size4);
      getInIframeWithIndex("body", "[data-test=close-dialog-btn]", 2).should('have.css', 'font-size', largeFont.size4);
      getInIframeWithIndex("body", "[data-test=close-dialog-btn]", 2).click();
      getInIframeWithIndex("body", ".drawing-tool-dialog--closeDialogSection--question-int div", 2).should('have.css', 'font-size', largeFont.size4);
      cy.wait(20000);
      getInIframeWithIndex("body", "[data-test=upload-btn]", 1).should('have.css', 'font-size', largeFont.size4);
      cy.wait(5000);
      getInIframeWithIndex("body", "[data-testid=snapshot-btn]", 2).should('have.css', 'font-size', largeFont.size4);
      */
    });
  });
  describe("Labbook",() => {
    it("verify large font size in labbook interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(7);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("Labbook", "Labbook");
      getInIframe("body", ".base-app--runtime--question-int p").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-testid=thumbnail-title]").eq(0).should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-testid=thumbnail]").should('have.css', 'font-size', largeFont.size2);
      getInIframe("body", ".thumbnail-wrapper--empty-content--question-int").eq(0).should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-testid=comment-field] [data-testid=thumbnail-title]").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-testid=comment-field] [data-testid=comment-field-textarea]").should('have.css', 'font-size', largeFont.size4);
      getInIframeWithIndex("body", "[data-testid=upload-btn]", 1).should('have.css', 'font-size', largeFont.size4);
      getInIframeWithIndex("body", ".upload-button--upload-button--question-int", 1).eq(1).should('have.css', 'font-size', largeFont.size4);
    });
  });
  describe("MCQ",() => {
    it("verify large font size in mcq interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(8);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("MCQ", "MCQ");
      getInIframe("body", ".base-app--runtime--question-int p").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-cy=choices-container]").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-cy=choices-container] .radio-choice input").eq(0).click();
      getInIframe("body", "[data-cy=check-answer-button]").should('have.css', 'font-size', largeFont.size6);
      getInIframe("body", "[data-cy=lock-answer-button]").should('have.css', 'font-size', largeFont.size6);
      activityPage.clickNextPageArrow();
      activityPage.verifyAlertDialog();
      activityPage.getModalDialogHeader().should('have.css', 'font-size', largeFont.size5);
      activityPage.getModalDialogLabel().should('have.css', 'font-size', largeFont.size4);
      activityPage.clickCloseButton();
      getInIframe("body", "[data-cy=check-answer-button]").click();
      getInIframe("body", ".runtime--feedback--question-int").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-cy=lock-answer-button]").click();
      getInIframe("body", ".locked-info--header--question-int").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".locked-info--feedback--question-int").should('have.css', 'font-size', largeFont.size4);
    });
  });
  describe("Multiselect",() => {
    it("verify large font size in multiselect interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(9);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("Multiselect", "Multiselect");
      getInIframe("body", ".base-app--runtime--question-int p").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-cy=choices-container]").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-cy=choices-container] .radio-choice input").eq(0).click();
      getInIframe("body", "[data-cy=choices-container] .radio-choice input").eq(1).click();
      getInIframe("body", "[data-cy=check-answer-button]").click();
      getInIframe("body", ".runtime--feedback--question-int").should('have.css', 'font-size', largeFont.size4);
    });
  });
  describe("Open Response",() => {
    it("verify large font size in open response interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(10);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("Open Response", "Open Response");
      getInIframe("body", ".base-app--runtime--question-int p").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-testid=response-textarea]").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-testid=response-textarea]").type("Text Response");
      getInIframe("body", "[data-testid=response-textarea]").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-testid=timer-readout]").should('have.css', 'font-size', largeFont.size4);
    });
  });
  describe("Scaffolded",() => {
    it("verify large font size in scaffolded interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(11);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("Scaffolded", "Scaffold");
      getInIframe("body", ".runtime--runtime--question-int p").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".runtime--runtime--question-int").find("iframe").its("0.contentDocument.body").find('[data-testid=legend]').should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".runtime--runtime--question-int").find("iframe").its("0.contentDocument.body").find('[data-testid=response-textarea]').should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".runtime--buttons--question-int button").eq(0).should('have.css', 'font-size', largeFont.size6);
      getInIframe("body", ".runtime--runtime--question-int").find("iframe").its("0.contentDocument.body").find('[data-testid=response-textarea]').type("Scaffolded Open Response");
      cy.wait(2000);
      getInIframe("body", "[data-cy=lock-answer-button]").click();
      cy.wait(2000);
      getInIframe("body", ".runtime--runtime--question-int").find("iframe").its("0.contentDocument.body").find('[data-testid=legend]').should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".runtime--runtime--question-int").find("iframe").its("0.contentDocument.body").find('[data-testid=response-textarea]').should('have.css', 'font-size', largeFont.size4);

    });
  });
  /*

  DISABLED DUE TO SCOREBOT NO LONGER SENDING AN API RESPONSE.  SHOULD BE RE-ENABLED IF SCOREBOT IS FIXED.

  describe("ScoreBot",() => {
    it("verify large font size in scorebot interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(12);
      cy.wait(5000);
      fontSize.verifyHeaderHintLargeFont("ScoreBot", "ScoreBot");
      getInIframe("body", ".runtime--prompt--question-int p").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-testid=response-textarea]").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-testid=response-textarea]").type("Text Response");
      getInIframe("body", "[data-cy=scorebot-feedback-button]").click();
      cy.wait(5000);
      getInIframe("body", ".feedback--header--question-int").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".feedback--score--question-int .sc-gEvEer").should('have.css', 'font-size', largeFont.size2);
      getInIframe("body", ".feedback--score--question-int .sc-eqUAAy .scale-to-4").eq(0).should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".feedback--feedback--question-int").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-testid=response-textarea]").type("Text Response");
      getInIframe("body", ".feedback--outdatedMsg--question-int").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", "[data-cy=scorebot-feedback-button]").click();
      cy.wait(5000);
    });
  });
  describe("Side by side",() => {
    it("verify large font size in side by side interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(13);
      cy.wait(5000);
      activityPage.verifyPageContentHeader("Side by side");
      activityPage.getPageContentHeader().should('have.css', 'font-size', largeFont.size7);
      activityPage.verifyQuestionHeader("Side By Side");
      activityPage.getQuestionHeader().should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".base-app--runtime--question-int p").should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".base-app--runtime--question-int").find("iframe").eq(0).its("0.contentDocument.body").find('.base-app--runtime--question-int').should('have.css', 'font-size', largeFont.size4);
      getInIframe("body", ".iframe-runtime--hint--question-int").should('have.css', 'font-size', largeFont.size3);
    });
  });
  describe("Text Block",() => {
    it("verify large font size in text block interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(14);
      cy.wait(5000);
      activityPage.verifyPageContentHeader("Text Block");
      activityPage.getPageContentHeader().should('have.css', 'font-size', largeFont.size7);
      activityPage.getTextBlockName().should('have.css', 'font-size', largeFont.size4);
      activityPage.getTextBlockContent().should('have.css', 'font-size', largeFont.size4);
    });
  });
  describe("Video Interactive",() => {
    it("verify large font size in video interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(15);
      cy.wait(5000);
      activityPage.verifyPageContentHeader("Video Interactive");
      activityPage.getPageContentHeader().should('have.css', 'font-size', largeFont.size7);
      getInIframe("body", ".runtime--prompt--question-int").should('have.css', 'font-size', largeFont.size3);
      getInIframe("body", ".runtime--caption--question-int").should('have.css', 'font-size', largeFont.size3);
      getInIframe("body", ".runtime--credit--question-int").should('have.css', 'font-size', largeFont.size1);
      getInIframe("body", ".runtime--creditLink--question-int").should('have.css', 'font-size', largeFont.size1);
    });
  });
  describe("Summary Page",() => {
    it("verify large font size in summary page",()=>{
      beforeTest();
      activityPage.clickPageItem(16);
      cy.wait(2000);
      activityPage.getProgressText().should('have.css', 'font-size', largeFont.size5);
      activityPage.getSummaryActivityTitle().should('have.css', 'font-size', largeFont.size8);
      activityPage.getSummaryTableHead().should('have.css', 'font-size', largeFont.size4);
      activityPage.getSummaryTableRow().should('have.css', 'font-size', largeFont.size4);
      activityPage.getOrText().should('have.css', 'font-size', largeFont.size4);
      activityPage.getExitTextButton().should('have.css', 'font-size', largeFont.size6);
    });
  });
*/
});
