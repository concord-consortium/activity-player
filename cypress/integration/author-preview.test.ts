import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Author preview activity pages", () => {
  before(() => {
    cy.visit("?activity=sample-activity-hidden-content&author-preview=true");
  });
  it("verify page nav includes hidden pages", () => {
    cy.get(".nav-pages .page-button").should("have.length", 14);
  });
  it("verify hidden page includes warning banner", () => {
    activityPage.getPage(2).click();
    cy.get(".hidden-page-warning").should("be.visible");
  });
  it("verify page not hidden does not have warning banner", () => {
    activityPage.getNavPage(3).click();
    cy.get(".hidden-page-warning").should("not.exist");
  });
});

context("Non-Author preview activity pages", () => {
  before(() => {
    cy.visit("?activity=sample-activity-hidden-content");
  });
  it("verify page nav does not include hidden pages", () => {
    cy.get(".nav-pages .page-button").should("have.length", 12);
    activityPage.getNavPage(3).should("not.exist");
  });
  it("verify pages do not have warning banner", () => {
    activityPage.getNavPage(3).click();
    cy.get(".hidden-page-warning").should("not.exist");
  });
});


