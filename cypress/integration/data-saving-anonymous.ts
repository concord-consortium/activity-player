import { v4 as uuidv4 } from "uuid";
import ActivityPage from "../support/elements/activity-page";
import { getInIframe } from "../support/elements/iframe";

const activityPage = new ActivityPage;

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
    const runKey = uuidv4();
    const activityUrl = "?activity=sample-activity-1&enableFirestorePersistence";

    it("happens automatically after a small delay", () => {
      // Data is being saved in two ways:
      // 1. After a small delay (to prevent spamming the database)
      // 2. When user changes the activity pages using header navigation.
      // This test focuses on 1. case.
      const activityUrlWithRunKey = activityUrl + "&runKey=" + runKey;
      cy.visit(activityUrlWithRunKey + "&clearFirestorePersistence");
      activityPage.getNavPage(2).click();
      getInIframe("body", "[data-cy=choices-container] input").eq(1).click({force: true});

      cy.wait(3000);

      // We are essentially reloading the page here but in this case we are not clearing the persistance first
      // this should force the activity player to load the data back in from the runKey
      cy.visit(activityUrlWithRunKey);
      activityPage.getNavPage(2).click();
      getInIframe("body", "[data-cy=choices-container] input").eq(1).should("be.checked");
    });

    it("is enforced when user changes the page", () => {
      // Data is being saved in two ways:
      // 1. After a small delay (to prevent spamming the database)
      // 2. When user changes the activity pages using header navigation.
      // This test focuses on 2. case.
      const activityUrlWithRunKey = activityUrl + "&runKey=" + runKey;
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
      const activityUrlWithRunKey = activityUrl + "&runKey=" + runKey;

      // Answer the question
      cy.visit(activityUrlWithRunKey + "&clearFirestorePersistence");
      activityPage.getNavPage(2).click();
      getInIframe("body", "[data-cy=choices-container] input").eq(1).click({force: true});

      cy.get("[data-cy=account-owner").click({force: true});
      cy.wait(3000);

      // Make sure the answer is actually saved in storage
      cy.visit(activityUrlWithRunKey);
      activityPage.getNavPage(2).click();
      getInIframe("body", "[data-cy=choices-container] input").eq(1).should("be.checked");

      // Look at the page without a runKey
      cy.visit(activityUrl);
      activityPage.getNavPage(2).click();
      getInIframe("body", "[data-cy=choices-container] input").eq(1).should("not.be.checked");
    });
  });
});
