// add code coverage support
import "@cypress/code-coverage/support";
// adds cy.realPress/realClick/etc. which dispatch trusted events (e.g. so a
// native <a> activates on a real keyboard Enter, which synthetic .type() cannot do)
import "cypress-real-events";

Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});
