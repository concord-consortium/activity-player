import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;

context("Author preview activity pages", () => {
  before(() => {
    cy.visit("?activity=sample-activity-hidden-content&author-preview=true");
  });
  it("Author preview activity pages", () => {
    cy.log("verify page nav includes hidden pages");
    cy.get(".nav-pages .page-button").should("have.length", 14);

    cy.log("verify hidden page includes warning banner");
    cy.get("[data-cy=nav-pages-button]").eq(1).click();
    cy.get(".hidden-page-warning").should("be.visible");

    cy.log("verify page not hidden does not have warning banner");
    activityPage.getNavPage(2).click();
    cy.get(".hidden-page-warning").should("not.exist");
  });
});

context("Non-Author preview activity pages", () => {
  before(() => {
    cy.visit("?activity=sample-activity-hidden-content");
  });
  it("Non-Author preview activity pages", () => {
    cy.log("verify page nav does not include hidden pages");
    cy.get(".nav-pages .page-button").should("have.length", 12);
    activityPage.getNavPage(3).should("not.exist");

    cy.log("verify pages do not have warning banner");
    activityPage.getNavPage(1).click();
    cy.get(".hidden-page-warning").should("not.exist");
    activityPage.getNavPage(2).click();
    cy.get(".hidden-page-warning").should("not.exist");
  });
});
