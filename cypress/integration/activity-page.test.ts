import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Test the overall app", () => {
  before(() => {
    cy.visit("?activity=sample-activity-multiple-layout-types");
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
      activityPage.getSecondaryEmbeddable("text-box").scrollIntoView()
        .should("be.visible").and("contain","Duis vitae ultrices augue, eu fermentum elit.");
    });
  });
});
