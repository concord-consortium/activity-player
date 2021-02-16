/// <reference types="cypress" />

// extend Cypress with commands from cypress-localstorage-commands package

declare namespace Cypress {
  interface Chainable<Subject> {

    /**
     * Saves current localStorage values into an internal "snapshot".
     * @example
     * cy.saveLocalStorage()
     */
    saveLocalStorage(): Chainable<any>

    /**
     * Restores localStorage to previously "snapshot" saved values.
     * @example
     * cy.restoreLocalStorage()
     */
    restoreLocalStorage(): Chainable<any>

    /**
     * Clears localStorage "snapshot" values, so previously saved values are cleaned.
     * @example
     * cy.clearLocalStorageSnapshot()
     */
    clearLocalStorageSnapshot(): Chainable<any>
  }
}
