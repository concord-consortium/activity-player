import SequencePage from "../support/elements/sequence-page";
import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage;
const sequencePage = new SequencePage;

context("Test sequences", () => {
  describe("test sequence intro page", () => {
    before(() => {
      cy.visit("?sequence=sample-sequence&preview");
      cy.wait(1000);
    });
    it("should load sequence thumbnails", () => {
      sequencePage.getThumbnails().should("have.length", 5);
    });
    it("should navigate to activity when activity thumbnail is selected", () => {
      activityPage.getHeader().should("contain", "Sequence");
      sequencePage.getThumbnails().eq(0).click();
      activityPage.getHeader().should("contain", "Sequence");
    });
  });
});
