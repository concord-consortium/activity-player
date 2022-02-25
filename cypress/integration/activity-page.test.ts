import ActivityPage from "../support/elements/activity-page";
import { getInIframe } from "../support/elements/iframe";

const activityPage = new ActivityPage;

context("Test the overall app", () => {
  before(() => {
    cy.visit("?activity=sample-activity-multiple-layout-types&preview");
    activityPage.getPage(2).click();
  });
  describe("URL",() => {
    it("verify URL does not include sequenceActivity param",()=>{
      cy.url().should("not.contain", "sequenceActivity");
    });
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
    it("verify collapsible column",()=>{
      activityPage.getCollapsibleHeader().should("contain", "Hide");
      activityPage.getCollapsibleHeader().click();
      activityPage.getCollapsibleHeader().should("have.class", "collapsed").and("contain", "Show");
      activityPage.getCollapsibleHeader().click();
      activityPage.getCollapsibleHeader().should("have.not.class", "collapsed").and("contain", "Hide");
    });
    it("verify textbox",()=>{
      activityPage.getNavPage(3).click();
      activityPage.getSecondaryEmbeddable("text-box").eq(1).scrollIntoView()
        .should("be.visible").and("contain","Duis vitae ultrices augue, eu fermentum elit.");
    });
  });
  describe("Required questions",()=>{
    it("verify locked navigation",()=>{
      activityPage.getNavPage(5).click();
      cy.wait(1000);
      activityPage.getNavPage(6).should("have.class", "disabled");
      activityPage.getNavPage(6).click();
      cy.wait(1000);
      activityPage.getModalDialogMessage().should("have.length", 1);
      activityPage.getModalDialogClose().click();
      activityPage.getModalDialogMessage().should("have.length", 0);
    });
  });
  describe("First and last page",()=>{
    it("verify arrow navigation is disabled when on the first or last page",()=>{
      activityPage.getHomeButton().eq(1).click();
      cy.wait(1000);
      activityPage.getPreviousPageButton().should("have.class", "last-page");
      activityPage.getCompletionPage().eq(0).click();
      cy.wait(1000);
      activityPage.getNextPageButton().should("have.class", "last-page");

    });
  });
  describe("Question Interactives",()=>{
    it("verify we can load a managed interactive",()=>{
      cy.visit("?activity=sample-activity-1&preview");
      activityPage.getNavPage(2).click();
      getInIframe("body", "[data-cy=choices-container]").should("be.visible");
    });
  });
  describe("Reset buttons",()=>{
    it("verify we can load an iFrame interactive that has a reset button",()=>{
      cy.visit("?activity=sample-activity-1100px&preview");
      activityPage.getNavPage(1).click();
      cy.get("[data-cy=reset-button]").scrollIntoView().should("be.visible");
    });
    it("verify some iFrame interactives may not have a reset button",()=>{
      cy.visit("?activity=sample-activity-1100px&preview");
      activityPage.getNavPage(2).click();
      cy.get("[data-cy=reset-button]").should("not.exist");
    });
  });
  describe("Hidden pages",()=>{
    it("verify hidden content",()=>{
      cy.visit("?activity=sample-activity-hidden-content&preview");
      activityPage.getNavPage(2).click();
      cy.wait(500);
      cy.get("[data-cy=text-box]").should("contain", "This is the 3rd activity page.");
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

context("Test fixed width settings", () => {
  it("defaults to 1100px", () => {
    cy.visit("?activity=sample-activity-multiple-layout-types&preview");
    activityPage.getPage(5).click();
    activityPage.getActivity()
      .should("be.visible")
      .and("have.length", 1)
      .and("have.class", "fixed-width-1100px");
    activityPage.getActivity()
      .first()
      .invoke("css", "width")
      .then(str => parseInt(str as unknown as string, 10))
      .should("eq", 1100);
  });

  it("shows responsive if a section in the page is responsive", () => {
    cy.visit("?activity=sample-activity-multiple-layout-types&preview");
    activityPage.getPage(2).click();
    activityPage.getActivity()
      .should("be.visible")
      .and("have.length", 1)
      .and("have.class", "responsive")
      .and("have.not.class", "fixed-width-1100px");
  });

  it("uses 960px for iPad friendly activities", () => {
    cy.visit("?activity=sample-activity-ipad-friendly&preview");
    activityPage.getPage(2).click();
    activityPage.getActivity()
      .should("be.visible")
      .and("have.length", 1)
      .and("have.class", "fixed-width-ipad-friendly");
    activityPage.getActivity()
      .first()
      .invoke("css", "width")
      .then(str => parseInt(str as unknown as string, 10))
      .should("eq", 960);
  });
});
