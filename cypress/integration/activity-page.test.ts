import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Test the overall app", () => {
  before(() => {
    cy.visit("?activity=sample-activity-multiple-layout-types");
    activityPage.getPage(2).click();
  });
  describe('Sidebar',() => {
    it('verify sidebar opens',()=>{
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
  describe('Info/Assess (secondary embeddables)',()=>{
    it('verify image question',()=>{
      activityPage.getSecondaryEmbeddable("image-question").eq(0).scrollIntoView().should('be.visible').and('contain',"This should be an image question");
    });
    it('verify textbox',()=>{
      activityPage.getSecondaryEmbeddable("text-box").scrollIntoView().should('be.visible').and('contain',"this is a text box");
    });
    it('verify multiple choice question',()=>{
      activityPage.getSecondaryEmbeddable("multiple-choice-question").scrollIntoView().should('be.visible').and('contain',"Multiple choice question");
    });
    it('verify open response question',()=>{
      activityPage.getSecondaryEmbeddable("open-response-question").scrollIntoView().should('be.visible').and('contain',"open response question");
    });
    it('verify labbook question',()=>{
      activityPage.getSecondaryEmbeddable("labbook-question").scrollIntoView().should('be.visible').and('contain',"Labbook type question");
    });
    it('verify iframe interactive question',()=>{
      activityPage.getSecondaryEmbeddable("iframe-interactive-question").scrollIntoView().should('be.visible');
      activityPage.getSecondaryEmbeddable("iframe-interactive-question").find("iframe").should("have.attr", "src","https://lab.concord.org/embeddable-staging.html#interactives/interaction-tests/viewport.json");
    });
    it('verify image interactive',()=>{
      activityPage.getSecondaryEmbeddable("image-video-interactive").eq(0).scrollIntoView().should('be.visible');
      activityPage.getSecondaryEmbeddable("image-video-interactive").eq(0).find('img').should("have.attr","src","https://media.newyorker.com/photos/5d38c026347b0e000865de67/4:3/w_1555,h_1166,c_limit/Jordan-MadMagazine-1.jpg");
    });
    it('verify video interactive',()=>{
      activityPage.getSecondaryEmbeddable("image-video-interactive").eq(1).scrollIntoView().should('be.visible');
      activityPage.getSecondaryEmbeddable("image-video-interactive").eq(1).find('video source').should("have.attr","src","https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
    });
    it('verify upload image question',()=>{
      activityPage.getSecondaryEmbeddable("image-question").eq(1).scrollIntoView().should('be.visible').and('contain',"Upload image question");
    });
  });
});
