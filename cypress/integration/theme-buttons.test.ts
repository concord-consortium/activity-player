// https://stackoverflow.com/a/33184805
function getColorCSS(c: string) {
    const elt = document.createElement("div");
    elt.style.color = c;
    return elt.style.color.replace(/\s+/,"").toLowerCase();
}
function isValidColor(c: string) {
  return !!getColorCSS(c);
}

const themeIds = [
  "teal",
  "orange",
  "cbio",
  "waters",
  "interactions",
  "image"
];

context("Test theme buttons", () => {
  before(() => {
    cy.visit("/?themeButtons&preview");
  });

  describe("Theme buttons",()=>{
    it("render when appropriate",()=>{
      cy.get("[data-cy=theme-buttons]").scrollIntoView();
      themeIds.forEach(id => {
        cy.get(`[data-cy=theme-button-${id}]`).should("be.visible");
      });
    });

    it("have access to imported text colors", () => {
      themeIds.forEach(id => {
        cy.get(`[data-cy=theme-button-${id}]`)
          .then(elt => {
            // verify that values imported from .scss files are imported successfully
            // will fail if css-loader is not configured appropriately in webpack.config.js
            expect(isValidColor(Cypress.$(elt).data("light-text-color"))).to.equal(true);
            expect(isValidColor(Cypress.$(elt).data("dark-text-color"))).to.equal(true);
          });
      });
    });
  });
});
