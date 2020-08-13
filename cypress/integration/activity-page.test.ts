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
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500);
      getIframeBody("body").find("[data-cy=choices-container]").should("be.visible");
    });
  });
});
