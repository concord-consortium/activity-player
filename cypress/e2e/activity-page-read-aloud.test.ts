import ActivityPage from "../support/elements/activity-page";
import { getInIframe, getInIframeWithIndex } from "../support/elements/iframe";
import { readAlound } from "../support/testdata/font-size_read-alound";
import ReadAloud from "../support/elements/read-aloud";

const activityPage = new ActivityPage;
const readAloud = new ReadAloud;

function beforeTest() {
  cy.visit("?activity=https%3A%2F%2Fauthoring.lara.staging.concord.org%2Fapi%2Fv1%2Factivities%2F112.json&preview");
  activityPage.getActivityTitle().should("contain", "AutomationActivityForAPReadAloud");
}

context("Test the overall app", () => {
  describe("Home Page",() => {
    it("verify read aloud in home page",()=>{
      beforeTest();
      activityPage.clickReadAloudToggle();
      activityPage.getActivityTitle().click().should('have.css', 'background-color',readAlound.backgroundColor);
    });
  });
  describe("Bar Graph",() => {
    it("verify read aloud in bar graph interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(0);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".base-app--runtime--question-int p").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Carousel",() => {
    it("verify read aloud in carousel interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(1);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".runtime--runtime--question-int p").eq(0).parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Drag & Drop",() => {
    it("verify read aloud in drag & drop interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(2);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".base-app--runtime--question-int p").eq(0).parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Drawing Tool",() => {
    it("verify read aloud in drawing tool interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(3);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".base-app--runtime--question-int p").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("FIB",() => {
    it("verify read aloud in fill in the blanks interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(4);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".base-app--runtime--question-int p").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Image Interactive",() => {
    it("verify read aloud in image interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(5);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".runtime--caption--question-int").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Image Question",() => {
    it("verify read aloud in image question interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(6);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".base-app--runtime--question-int p").eq(0).parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Labbook",() => {
    it("verify read aloud in labbook interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(7);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".base-app--runtime--question-int p").parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("MCQ",() => {
    it("verify read aloud in mcq interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(8);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".base-app--runtime--question-int p").parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Open Response",() => {
    it("verify read aloud in open response interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(9);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".base-app--runtime--question-int p").parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Scaffolded",() => {
    it("verify read aloud in scaffolded interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(10);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".runtime--runtime--question-int p").eq(0).parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  /*

  DISABLED DUE TO SCOREBOT NO LONGER SENDING AN API RESPONSE. SHOULD BE RE-ENABLED IF SCOREBOT IS FIXED.

  describe("ScoreBot",() => {
    it("verify read aloud in scorebot interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(11);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".runtime--prompt--question-int p").parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Side by side",() => {
    it("verify read aloud in side by side interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(12);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".base-app--runtime--question-int p").eq(0).parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Multiselect",() => {
    it("verify read aloud in multiselect interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(13);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".base-app--runtime--question-int p").parent().parent().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Video Interactive",() => {
    it("verify read aloud in video interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(14);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      getInIframe("body", ".runtime--caption--question-int").children().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  describe("Text Block",() => {
    it("verify read aloud in text block interactive",()=>{
      beforeTest();
      activityPage.clickPageItem(15);
      cy.wait(5000);
      activityPage.clickReadAloudToggle();
      activityPage.getTextBlockContent().children().click().should('have.css', 'background-color', readAlound.backgroundColor);
    });
  });
  */
});
