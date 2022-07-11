context("Idle warning", () => {
  beforeEach(() => {
    cy.clock();
  });

  context("when user is anonymous", () => {
    it("shows after 20 minutes of inactivity and lets user continue his work", () => {
      cy.visit("?activity=sample-activity-1&__skipGetApRun=true");
      cy.tick(1000); // necessary to "download" sample activity. AP uses setTimeout(, 250) for fake network request.
      cy.get("[data-cy=activity-summary]").should("contain", "Single Page Test Activity");
      cy.tick(21 * 60 * 1000); // 21 minutes
      cy.get("[data-cy=idle-warning]").should("contain", "You've been idle for too long.");

      cy.get("[data-cy=continue]").click();
      // Activity should be visible again.
      cy.get("[data-cy=activity-summary]").should("contain", "Single Page Test Activity");
    });
  });

  context("when user is logged in", () => {
    // __cypressLoggedIn is used to trigger logged in code path for Cypress tests.
    // Eventually it should be replaced with better patterns for testing logged in users (probably via using
    // `token` param and stubbing network requests).

    it("shows after 20 minutes of inactivity and lets user continue his work", () => {
      cy.visit("?activity=sample-activity-1&__cypressLoggedIn=true&__skipGetApRun=true");
      cy.tick(1000); // necessary to "download" sample activity. AP uses setTimeout(, 250) for fake network request.
      cy.get("[data-cy=activity-summary]").should("contain", "Single Page Test Activity");
      cy.tick(21 * 60 * 1000); // 21 minutes
      cy.get("[data-cy=idle-warning]").should("contain", "your session is about to expire");

      cy.get("[data-cy=continue]").click();
      // Activity should be visible again.
      cy.get("[data-cy=activity-summary]").should("contain", "Single Page Test Activity");
    });

    it("shows after 20 minutes of inactivity and lets user go back to Portal", () => {
      cy.visit("?activity=sample-activity-1&__cypressLoggedIn=true&__skipGetApRun=true");
      cy.tick(1000); // necessary to "download" sample activity. AP uses setTimeout(, 250) for fake network request.
      cy.get("[data-cy=activity-summary]").should("contain", "Single Page Test Activity");
      cy.tick(21 * 60 * 1000); // 21 minutes
      cy.get("[data-cy=idle-warning]").should("contain", "your session is about to expire");

      cy.get("[data-cy=exit]").click();
      cy.url().should("eq", "https://learn.concord.org/");
    });
  });
});
