import * as PortalApi from "../../src/portal-api";

context("Test the app after loading mock data from the portal", () => {

  describe("Calling the API",() => {
    before(() => {
      cy.stub(PortalApi, "fetchPortalData", () => {
        return Promise.resolve({
          type: "authenticated",
          contextId: "context-id",
          database: {
            appName: "report-service-dev",
            sourceKey: "localhost",
            rawFirebaseJWT: "abc"
          },
          offering: {
            id: 1,
            activityUrl: "http://example/activities/1",
            rubricUrl: ""
          },
          platformId: "https://example",
          platformUserId: "1",
          resourceLinkId: "2",
          resourceUrl: "http://example/resource",
          toolId: "activity-player.concord.org",
          userType: "learner",
          fullName: "Some Student"
        });
      });
      cy.visit("/?activity=sample-activity-1&token=abc&domain=abc&enableFirestorePersistence");
    });

    it("calls 'fetchPortalData' when launches with a token", () => {
      expect(PortalApi.fetchPortalData).to.be.called;
    });

    it("verify student name shows",()=>{
      cy.get("[data-cy=profile-nav-header]").should("be.visible");
      cy.get("[data-cy=profile-nav-header]").should("contain", "Welcome, Some Student");
    });
  });
});
