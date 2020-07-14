import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Test the overall app", () => {
  before(() => {
    cy.visit("?activity=sample-activity-multiple-layout-types");
    activityPage.getPage(2).click();
  });
  describe("Sidebar",() => {
    it("verify sidebar opens",()=>{
      const content="the same type of protein that makes up hair and fingernails";
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
      activityPage.getSecondaryEmbeddable("text-box").scrollIntoView()
        .should("be.visible").and("contain","We want to see some text here");
    });
    it("verify iframe interactive question",()=>{
      activityPage.getSecondaryEmbeddable("iframe-interactive-question").scrollIntoView().should("be.visible");
      activityPage.getSecondaryEmbeddable("iframe-interactive-question").find("iframe").should("have.attr", "src","https://lab.concord.org/embeddable-staging.html#interactives/interaction-tests/viewport.json");
    });
  });
});
