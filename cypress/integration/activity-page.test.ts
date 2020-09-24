import ActivityPage from "../support/elements/activity-page";
import { getIframeBody } from "../support/elements/iframe";

const activityPage = new ActivityPage;

context("Test the overall app", () => {
  before(() => {
    cy.visit("?activity=sample-activity-multiple-layout-types&preview");
    activityPage.getPage(2).click();
  });
  describe("Sidebar",() => {
    it("verify sidebar opens",()=>{
      const content="Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
      activityPage.getSidebarTab().click();
      activityPage.getSidebarContent().should("be.visible").and("contain", content);
    });
    it("verify sidebar closes when tab is clicked",()=>{
      activityPage.getSidebarTab().click();
      activityPage.getSidebarContent().should("not.be.visible");
    });
    it("verify sidebar closes when the close button is clicked",()=>{
      activityPage.getSidebarTab().click();
      activityPage.getSidebarContent().should("be.visible");
      activityPage.getSidebarCloseButton().click();
      activityPage.getSidebarContent().should("not.be.visible");
    });
  });
  describe("Info/Assess (secondary embeddables)",()=>{
    it("verify textbox",()=>{
      activityPage.getNavPage(3).click();
      activityPage.getSecondaryEmbeddable("text-box").eq(1).scrollIntoView()
        .should("be.visible").and("contain","Duis vitae ultrices augue, eu fermentum elit.");
    });
  });
  describe("Question Interactives",()=>{
    it("verify we can load a managed interactive",()=>{
      cy.visit("?activity=sample-activity-1&preview");
      activityPage.getNavPage(2).click();
      cy.wait(500);
      getIframeBody("body").find("[data-cy=choices-container]").should("be.visible");
    });
  });
});

context("Test the teacher edition plugin", () => {
  describe("text page 1 teacher edition features", () => {
    before(() => {
      cy.visit("?mode=teacher-edition&activity=sample-activity-plugins");
      cy.wait(1000);
      activityPage.getPage(1).click();
    });
    it("should show teacher edition banner", () => {
      cy.get(".teacher-edition-banner").should("be.visible");
    });
    it("should have the right number of decorated interactives and window shades", () => {
      cy.get(".question-wrapper--questionWrapper--TETipsPluginV1").should("have.length", 3);
      cy.get(".window-shade--windowShade--TETipsPluginV1").should("have.length", 1);
    });
  });
  describe("text page 2 teacher edition features", () => {
    before(() => {
      cy.visit("?mode=teacher-edition&activity=sample-activity-plugins");
      cy.wait(1000);
      activityPage.getPage(2).click();
    });
    it("should show teacher edition banner", () => {
      cy.get(".teacher-edition-banner").should("be.visible");
    });
    it("should have the right number of window shades", () => {
      cy.get(".window-shade--windowShade--TETipsPluginV1").should("have.length", 4);
    });
  });
});
