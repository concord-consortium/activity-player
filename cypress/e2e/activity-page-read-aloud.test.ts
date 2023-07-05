import ActivityPage from "../support/elements/activity-page";
import { getInIframe, getInIframeWithIndex } from "../support/elements/iframe";
import { readAlound } from "../support/testdata/font-size_read-alound";
import ReadAloud from "../support/elements/read-aloud";

const activityPage = new ActivityPage;
const readAloud = new ReadAloud;

context("Test the overall app", () => {
  before(() => {
    cy.visit("?activity=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Factivities%2F112.json&preview");
    activityPage.getActivityTitle().should("contain", "Automation Activity For AP Read Aloud");
  });
  describe("Home Page",() => {
    it("verify read aloud in home page",()=>{
      activityPage.clickReadAloudToggle();
      activityPage.getHeaderActivityTitle().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      activityPage.getActivityTitle().click().should('have.css', 'background-color',readAlound.backgroundColor);
      cy.get('.activity-content.intro-txt').parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      activityPage.getEstimatedTime().parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      activityPage.getPagesHeader().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Bar Graph",() => {
    it("verify read aloud in bar graph interactive",()=>{
      activityPage.clickPageItem(0);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".base-app--runtime--question-int p").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", "[data-cy=title] div").click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", "[data-cy=yAxisLabel] div").click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", "[data-cy=xAxisLabel] div").click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Carousel",() => {
    it("verify read aloud in carousel interactive",()=>{
      activityPage.clickPageButton(1);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".runtime--runtime--question-int p").eq(0).parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".runtime--runtime--question-int").find("iframe").its("0.contentDocument.body").find('[data-testid=legend]').parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".iframe-runtime--hint--question-int p").eq(0).parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Drag & Drop",() => {
    it("verify read aloud in drag & drop interactive",()=>{
      activityPage.clickPageButton(2);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".base-app--runtime--question-int p").eq(0).parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".container--prompt--question-int div").click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".draggable-item-wrapper--itemLabel--question-int div").eq(0).click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".drop-zone-wrapper--targetLabel--question-int div").eq(0).click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Drawing Tool",() => {
    it("verify read aloud in drawing tool interactive",()=>{
      activityPage.clickPageButton(3);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".base-app--runtime--question-int p").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("FIB",() => {
    it("verify read aloud in fill in the blanks interactive",()=>{
      activityPage.clickPageButton(4);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".base-app--runtime--question-int p").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Image Interactive",() => {
    it("verify read aloud in image interactive",()=>{
      activityPage.clickPageButton(5);
      cy.wait(5000);
      activityPage.getPageContentHeader().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".runtime--caption--question-int").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".runtime--credit--question-int").children().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Image Question",() => {
    it("verify read aloud in image question interactive",()=>{
      activityPage.clickPageButton(6);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".base-app--runtime--question-int p").eq(0).parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".base-app--runtime--question-int p").eq(1).parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", "[data-test=edit-btn]").click();
      cy.wait(5000);
      getInIframe("body", ".drawing-tool-dialog--dialogContent--question-int").should("be.visible");
      getInIframe("body", ".drawing-tool-dialog--dialogRightPanel--question-int div p").eq(0).parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".drawing-tool-dialog--answerPrompt--question-int p").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", "[data-test=close-dialog-btn]").click();
      cy.wait(20000);
    });
  });
  describe("Labbook",() => {
    it("verify read aloud in labbook interactive",()=>{
      activityPage.clickPageButton(6);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".base-app--runtime--question-int p").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("MCQ",() => {
    it("verify read aloud in mcq interactive",()=>{
      activityPage.clickPageButton(6);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".base-app--runtime--question-int p").parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", "[data-cy=choices-container] .radio-choice label span").eq(0).click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", "[data-cy=check-answer-button]").click();
      getInIframe("body", ".runtime--feedback--question-int span").click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", "[data-cy=lock-answer-button]").click();
      getInIframe("body", ".locked-info--header--question-int span").click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".locked-info--feedback--question-int div").click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Open Response",() => {
    it("verify read aloud in open response interactive",()=>{
      activityPage.clickPageButton(6);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".base-app--runtime--question-int p").parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Scaffolded",() => {
    it("verify read aloud in scaffolded interactive",()=>{
      activityPage.clickPageButton(6);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".runtime--runtime--question-int p").eq(0).parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".runtime--runtime--question-int").find("iframe").its("0.contentDocument.body").find('[data-testid=legend]').parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".runtime--runtime--question-int").find("iframe").its("0.contentDocument.body").find('[data-testid=response-textarea]').type("Scaffolded Open Response");
      cy.wait(2000);
      getInIframe("body", "[data-cy=lock-answer-button]").click();
      cy.wait(2000);
      getInIframe("body", ".iframe-runtime--hint--question-int p").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
 describe("ScoreBot",() => {
    it("verify read aloud in scorebot interactive",()=>{
      activityPage.clickPageButton(6);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".runtime--prompt--question-int p").parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", "[data-testid=response-textarea]").type("Text Response");
      getInIframe("body", "[data-cy=scorebot-feedback-button]").click();
      cy.wait(5000);
      getInIframe("body", ".feedback--header--question-int").children().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".feedback--score--question-int .sc-gEvEer").children().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".feedback--score--question-int .sc-iGgWBj .scale-to-4").eq(0).children().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".feedback--feedback--question-int").children().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Side by side",() => {
    it("verify read aloud in side by side interactive",()=>{
      activityPage.clickPageButton(6);
      cy.wait(5000);
      activityPage.getPageContentHeader().click().should('have.css', 'background-color', readAlound.backgroundColor);
      activityPage.getQuestionHeader().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".base-app--runtime--question-int p").eq(0).parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".base-app--runtime--question-int").find("iframe").eq(0).its("0.contentDocument.body").find('.runtime--prompt--question-int').parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".base-app--runtime--question-int").find("iframe").eq(1).its("0.contentDocument.body").find('.runtime--prompt--question-int').parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".iframe-runtime--hint--question-int div").eq(0).click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".iframe-runtime--hint--question-int div").eq(1).click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Multiselect",() => {
    it("verify read aloud in multiselect interactive",()=>{
      activityPage.clickPageButton(7);
      cy.wait(5000);
      readAloud.verifyHeaderHintReadAloud();
      getInIframe("body", ".base-app--runtime--question-int p").parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", "[data-cy=choices-container] .radio-choice label span").eq(0).click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", "[data-cy=check-answer-button]").click();
      getInIframe("body", ".runtime--feedback--question-int").children().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Video Interactive",() => {
    it("verify read aloud in video interactive",()=>{
      activityPage.clickPageButton(8);
      cy.wait(5000);
      activityPage.getPageContentHeader().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".runtime--prompt--question-int").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".runtime--caption--question-int").children().click().should('have.css', 'background-color', readAlound.backgroundColor);
      getInIframe("body", ".runtime--credit--question-int").children().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Text Block",() => {
    it("verify read aloud in text block interactive",()=>{
      activityPage.clickPageButton(9);
      cy.wait(5000);
      activityPage.getPageContentHeader().click().should('have.css', 'background-color', readAlound.backgroundColor);
      activityPage.getTextBlockName().children().click().should('have.css', 'background-color', readAlound.backgroundColor);
      activityPage.getTextBlockContent().children().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Summary Page",() => {
    it("verify read aloud in summary page",()=>{
      activityPage.clickCompletionPageButton();
      cy.wait(2000);
      activityPage.getProgressText().children().click().should('have.css', 'background-color', readAlound.backgroundColor);
      activityPage.getSummaryActivityTitle().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
      activityPage.getSummaryTableHead().click().should('have.css', 'background-color', readAlound.backgroundColor);
      activityPage.getSummaryTableRow().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
});
