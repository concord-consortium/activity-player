import { v4 as uuidv4 } from "uuid";
import ActivityPage from "../support/elements/activity-page";
import SequencePage from "../support/elements/sequence-page";
import { getInIframe } from "../support/elements/iframe";

const activityPage = new ActivityPage;
const sequencePage = new SequencePage;

context("Saving and loading data as an anonymous user", () => {

  describe("Setting the run key", () => {
    it("will set the run key if we are not in preview mode", () => {
      cy.visit("?activity=sample-activity-1");
      activityPage.getNavPage(2).click();
      cy.url().should("include", "runKey");
    });

    it("will not set the run key if we are in preview mode", () => {
      cy.visit("?activity=sample-activity-1&preview");
      cy.url().should("not.include", "runKey");
    });
  });

  describe("Data saving", () => {
    const activityRunKey = uuidv4();
    const sequenceRunKey = uuidv4();
    const activityUrl = "?activity=sample-activity-1&enableFirestorePersistence";
    const sequenceUrl = "?sequence=sample-sequence&enableFirestorePersistence";

    it("happens automatically after a small delay", () => {
      // Data is being saved in two ways:
      // 1. After a small delay (to prevent spamming the database)
      // 2. When user changes the activity pages using header navigation.
      // This test focuses on 1. case.
      const activityUrlWithRunKey = activityUrl + "&runKey=" + activityRunKey;
      cy.visit(activityUrlWithRunKey + "&clearFirestorePersistence");
      activityPage.getNavPage(2).click();
      getInIframe("body", "[data-cy=choices-container] input").eq(1).click({force: true});

      cy.wait(3000);

      // We are essentially reloading the page here but in this case we are not clearing the persistance first
      // this should force the activity player to load the data back in from the runKey using the ap runs
      // which will reload page 2
      cy.visit(activityUrlWithRunKey);
      getInIframe("body", "[data-cy=choices-container] input").eq(1).should("be.checked");
    });

    it("is enforced when user changes the page", () => {
      // Data is being saved in two ways:
      // 1. After a small delay (to prevent spamming the database)
      // 2. When user changes the activity pages using header navigation.
      // This test focuses on 2. case.
      const activityUrlWithRunKey = activityUrl + "&runKey=" + activityRunKey;
      cy.visit(activityUrlWithRunKey + "&clearFirestorePersistence");

      // Select a MC answer on page 2, immediately (!) change page to 1, and then change page to 2 again.
      // Answer should not be lost, as AP should request all the interactive states before switching a page.
      // Do NOT use any cy.wait in this test, as it'll break its purpose. If this test fails, it most likely means
      // that one of the Imperative API #requestInteractiveState(s) functions is broken.
      activityPage.getNavPage(2).click();
      cy.contains("Question #2");
      getInIframe("body", "[data-cy=choices-container] input").eq(1).click({force: true});

      activityPage.getNavPage(1).click();
      activityPage.getNavPage(1).should("have.class", "current");
      cy.contains("Question #1");

      activityPage.getNavPage(2).click();
      activityPage.getNavPage(2).should("have.class", "current");
      cy.contains("Question #2");
      getInIframe("body", "[data-cy=choices-container] input").eq(1).should("be.checked");
    });

    it("is bound to runKey (after removing it, users no longer will see their data)", () => {
      const activityUrlWithRunKey = activityUrl + "&runKey=" + activityRunKey;

      // Answer the question
      cy.visit(activityUrlWithRunKey + "&clearFirestorePersistence");
      activityPage.getNavPage(2).click();
      getInIframe("body", "[data-cy=choices-container] input").eq(1).click({force: true});

      cy.get("[data-cy=account-owner").click({force: true});
      cy.wait(3000);

      // Make sure the answer is actually saved in storage
      cy.visit(activityUrlWithRunKey);
      getInIframe("body", "[data-cy=choices-container] input").eq(1).should("be.checked");

      // Look at the page without a runKey
      cy.visit(activityUrl);
      activityPage.getNavPage(2).click();
      getInIframe("body", "[data-cy=choices-container] input").eq(1).should("not.be.checked");
    });

    it("saves page positions in activities and sequences", () => {
      const activityUrlWithRunKey = activityUrl + "&runKey=" + activityRunKey;
      const sequenceUrlWithRunKey = sequenceUrl + "&runKey=" + sequenceRunKey;

      // load the activity
      cy.visit(activityUrlWithRunKey + "&clearFirestorePersistence");

      // go to page 2
      activityPage.getNavPage(2).click();
      cy.contains("Question #2");

      // reload without explicit page parameter and should be on page 2
      cy.visit(activityUrlWithRunKey);
      cy.contains("Question #2");

      // load the sequence
      cy.visit(sequenceUrlWithRunKey + "&clearFirestorePersistence");
      cy.wait(1000);

      // select activity 1, check that home is selected then select page 1
      sequencePage.getThumbnails().eq(0).click();
      cy.get("[data-cy=custom-select-header]").click();
      cy.get("[data-cy^=list-item-1]").click();
      cy.get("[data-cy=home-button].current").should('have.length', 2)
      activityPage.getNavPage(1).click();
      cy.get("[data-cy=nav-pages-button].current").contains("1")
      cy.get("[data-cy=home-button].current").should('have.length', 0)

      // select activity 4, check that home is selected then select page 1
      cy.get("[data-cy=custom-select-header]").click();
      cy.get("[data-cy^=list-item-4]").click();
      cy.get("[data-cy=home-button].current").should('have.length', 2)
      activityPage.getNavPage(1).click();
      cy.get("[data-cy=nav-pages-button].current").contains("1")
      cy.get("[data-cy=home-button].current").should('have.length', 0)

      // reload activities and check pages are auto loaded and home isn't selected
      cy.get("[data-cy=custom-select-header]").click();
      cy.get("[data-cy^=list-item-1]").click();
      cy.get("[data-cy=nav-pages-button].current").contains("1")
      cy.get("[data-cy=home-button].current").should('have.length', 0)

      cy.get("[data-cy=custom-select-header]").click();
      cy.get("[data-cy^=list-item-4]").click();
      cy.get("[data-cy=nav-pages-button].current").contains("1")
      cy.get("[data-cy=home-button].current").should('have.length', 0)
    });
  });
});
