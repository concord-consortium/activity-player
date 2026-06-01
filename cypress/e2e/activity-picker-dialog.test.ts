import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage();

context("Activity picker dialog (`noDefaultActivity` URL parameter)", () => {
  it("does not show when an activity is already specified", () => {
    cy.visit("?activity=sample-activity-codap&preview&page=1&noDefaultActivity=true");
    cy.get("[data-cy=activity-picker-dialog]").should("not.exist");
    activityPage.getInteractive().find("iframe").should("exist");
  });

  it("shows when `noDefaultActivity` is set and neither activity nor sequence is specified", () => {
    cy.visit("?noDefaultActivity=true");
    cy.get("[data-cy=activity-picker-dialog]").should("be.visible");
    cy.get("[data-cy=activity-picker-input]").should("be.focused");
    cy.get("[data-cy=activity-picker-submit]").should("be.disabled");
  });

  it("loads a sample activity key pasted into the dialog", () => {
    cy.visit("?noDefaultActivity=true");
    cy.get("[data-cy=activity-picker-input]").type("sample-activity-codap");
    cy.get("[data-cy=activity-picker-submit]").should("not.be.disabled").click();
    cy.url().should("include", "activity=sample-activity-codap");
    cy.url().should("not.include", "noDefaultActivity");
  });

  it("forwards all params from a pasted Activity Player launch URL", () => {
    cy.visit("?noDefaultActivity=true&preview");
    // Paste an AP-style launch URL that targets a local sample — the extractor
    // forwards all of its params (e.g. a student's domain/token) onto the
    // current URL so the run loads exactly as launched.
    const pasted = "https://activity-player.concord.org/branch/master/index.html" +
      "?activity=sample-activity-codap&domain_uid=77701";
    cy.get("[data-cy=activity-picker-input]").type(pasted, { parseSpecialCharSequences: false });
    cy.get("[data-cy=activity-picker-submit]").click();
    cy.url().should("include", "activity=sample-activity-codap");
    // All params on the pasted launch URL are forwarded
    cy.url().should("include", "domain_uid=77701");
    // The current URL's own params (preview) are preserved
    cy.url().should("include", "preview");
    // noDefaultActivity is dropped so the dialog isn't reshown
    cy.url().should("not.include", "noDefaultActivity");
  });
});
