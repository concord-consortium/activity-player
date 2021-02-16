// add code coverage support
import "@cypress/code-coverage/support";

// add localstorage commands
import "cypress-localstorage-commands"

Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false here prevents Cypress from
  // failing the test
  return false;
});
