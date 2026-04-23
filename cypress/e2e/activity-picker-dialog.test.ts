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

  it("extracts the activity reference from a pasted Activity Player URL", () => {
    cy.visit("?noDefaultActivity=true&preview");
    // Paste an AP-style URL that targets a local sample — the extractor should
    // forward just the `activity` param onto the current URL.
    const pasted = "https://activity-player.concord.org/branch/master/index.html" +
      "?activity=sample-activity-codap&foo=bar";
    cy.get("[data-cy=activity-picker-input]").type(pasted, { parseSpecialCharSequences: false });
    cy.get("[data-cy=activity-picker-submit]").click();
    cy.url().should("include", "activity=sample-activity-codap");
    // Unrelated params on the pasted URL are not forwarded
    cy.url().should("not.include", "foo=bar");
    // The current URL's own params (preview) are preserved
    cy.url().should("include", "preview");
  });
});
