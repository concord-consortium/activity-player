class CompletionPage {
  getProgressText() {
    return cy.get("[data-cy=progress-text]");
  }
  getNextActivityButtons() {
    return cy.get(".next-activity-buttons");
  }
  getSummaryTable() {
    return cy.get("[data-cy=summary-table]");
  }
  getSummaryTableRows() {
    return cy.get("[data-cy=summary-table-row]");
  }
  getQuestionLinks() {
    return cy.get("[data-testid=question-link]");
  }
  getExitButton() {
    return cy.get(".exit-container .textButton");
  }
}

export default CompletionPage;
