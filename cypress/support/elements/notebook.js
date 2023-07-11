import ActivityPage from "./activity-page";

const activityPage = new ActivityPage;

class Notebook {
  getNotebookHeader() {
    return cy.get('.notebookHeader');
  }
  getSectionTab(index) {
    return cy.get('.section-tabs .section-tab').eq(index);
  }
  getSeparator() {
    return cy.get('.sections .separator');
  }
  verifySectionTabNotDisplayed() {
    cy.get('.section-tabs .section-tab').should("not.exist");
  }
  verifySeparatorNotDisplayed() {
    cy.get('.sections .separator').should("not.exist");
  }
  verifyNotebookHeaderNotDisplayed() {
    cy.get('.notebookHeader').should("not.exist");
  }

}
export default Notebook;
