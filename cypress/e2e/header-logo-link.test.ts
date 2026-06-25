// The header logo is a semantic link with descriptive alt text:
//  - WCAG 4.1.2 (AP-86): the logo is a native <a> announced as a link.
//  - WCAG 1.1.1 (AP-87): the logo image alt matches the visible logo.

context("header logo link", () => {
  describe("project-supplied logo", () => {
    beforeEach(() => {
      cy.visit("?activity=sample-activity-multiple-layout-types&preview");
    });

    it("is a semantic anchor pointing at the project url", () => {
      cy.get("a[data-cy=project-logo]").should("exist");
      cy.get("[data-cy=project-logo]")
        .should("have.attr", "href", "http://mw.concord.org/nextgen")
        .and("have.attr", "target", "_blank");
      cy.get("[data-cy=project-logo]").invoke("attr", "rel").should("contain", "noopener");
    });

    it("renders the logo as an img whose alt matches the project title", () => {
      cy.get("img[data-cy=logo-img]").should("have.attr", "alt", "Molecular Workbench");
      cy.get("img[data-cy=logo-img]").invoke("attr", "src").should("contain", "mw-logo");
    });
  });

  describe("default Concord logo", () => {
    beforeEach(() => {
      // sample-activity-1 has no project logo or url, so the Concord Consortium
      // logo is shown and the link falls back to concord.org.
      cy.visit("?activity=sample-activity-1&preview");
    });

    it("is a semantic anchor pointing at concord.org", () => {
      cy.get("a[data-cy=project-logo]").should("exist");
      cy.get("[data-cy=project-logo]")
        .should("have.attr", "href", "https://concord.org/")
        .and("have.attr", "target", "_blank");
    });

    it("renders the Concord logo as an img with matching alt text", () => {
      cy.get("img[data-cy=logo-img]").should("have.attr", "alt", "Concord Consortium");
    });
  });
});
