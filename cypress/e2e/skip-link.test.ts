// AP-83: skip-to-main-content link (WCAG 2.4.1 Bypass Blocks).
context("AP-83 skip to main content", () => {
  beforeEach(() => {
    cy.visit("?activity=sample-activity-1&preview");
  });

  it("hides the skip link until focus, reveals it top-left, and moves focus to main", () => {
    // The skip link is the first focusable element and is visually hidden (off-screen).
    cy.get('[data-cy="skip-link"]')
      .should("have.attr", "href", "#main-content")
      .and("have.text", "Skip to main content");

    // Visually hidden by default: clipped to a 1x1px box (but still in the
    // accessible tree and tab order).
    cy.get('[data-cy="skip-link"]').then(($el) => {
      const rect = $el[0].getBoundingClientRect();
      expect(rect.width, "hidden width").to.be.at.most(1);
      expect(rect.height, "hidden height").to.be.at.most(1);
    });

    // On focus it becomes visible at the top-left of the viewport.
    cy.get('[data-cy="skip-link"]').focus();
    cy.get('[data-cy="skip-link"]').then(($el) => {
      const rect = $el[0].getBoundingClientRect();
      expect(rect.top, "visible top offset").to.be.lessThan(50);
      expect(rect.left, "visible left offset").to.be.greaterThan(-1).and.to.be.lessThan(50);
    });

    // Activating the link moves keyboard focus to the main content region.
    cy.get('[data-cy="skip-link"]').click();
    cy.focused().should("have.attr", "id", "main-content");
    cy.get("main#main-content").should("have.attr", "tabindex", "-1");
  });
});
