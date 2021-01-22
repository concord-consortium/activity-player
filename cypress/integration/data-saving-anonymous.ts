import { v4 as uuidv4 } from "uuid";
import ActivityPage from "../support/elements/activity-page";
import { getIframeBody } from "../support/elements/iframe";

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

  describe("Saving and loading data", () => {
    const runKey = uuidv4();
    const activityUrl = "?activity=sample-activity-1&enableFirestorePersistence";

    it("we can use a runKey to retrieve data previously persisted", () => {
      const activityUrlWithRunKey = activityUrl + "&runKey=" + runKey;

      cy.visit(activityUrlWithRunKey + "&clearFirestorePersistence");
      activityPage.getNavPage(2).click();
      cy.wait(1000);
      getIframeBody("body").find("[data-cy=choices-container] input").eq(1).click({force: true});

      // unfortunately we have to wait for the data to be posted to firestore, which happens after a
      // delay to prevent spamming the database.
      // The fastest and most reliable way to kick it off seems to be 1. blur, 2. wait, 3. navigate away
      cy.get("[data-cy=account-owner").click({force: true});
      cy.wait(3000);
      activityPage.getNavPage(1).click();

      // We are essentially reloading the page here but in this case we are not clearing the persistance first
      // this should force the activity player to load the data back in from the runKey
      cy.visit(activityUrlWithRunKey);
      activityPage.getNavPage(2).click();
      cy.wait(1000);
      getIframeBody("body").find("[data-cy=choices-container] input").eq(1).should("be.checked");
    });

    it("we can remove a runKey and we will no longer see our data", () => {
      const activityUrlWithRunKey = activityUrl + "&runKey=" + runKey;

      // Answer the question
      cy.visit(activityUrlWithRunKey + "&clearFirestorePersistence");
      activityPage.getNavPage(2).click();
      cy.wait(1000);
      getIframeBody("body").find("[data-cy=choices-container] input").eq(1).click({force: true});

      // unfortunately we have to wait for the data to be posted to firestore, which happens after a
      // delay to prevent spamming the database.
      // The fastest and most reliable way to kick it off seems to be 1. blur, 2. wait, 3. navigate away
      cy.get("[data-cy=account-owner").click({force: true});
      cy.wait(3000);
      activityPage.getNavPage(1).click();

      // Make sure the answer is actually saved in storage
      cy.visit(activityUrlWithRunKey);
      activityPage.getNavPage(2).click();
      cy.wait(1000);
      getIframeBody("body").find("[data-cy=choices-container] input").eq(1).should("be.checked");

      // Look at the page without a runKey
      cy.visit(activityUrl);
      activityPage.getNavPage(2).click();
      cy.wait(1000);
      getIframeBody("body").find("[data-cy=choices-container] input").eq(1).should("not.be.checked");
    });
  });
});
