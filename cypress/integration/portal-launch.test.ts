import ActivityPage from "../support/elements/activity-page";
import { getInIframe } from "../support/elements/iframe";

const activityPage = new ActivityPage;

context("Launch AP From the Portal", () => {
  /*
    Because cypress can't jump domains this uses cy.request to log into the portal as a student.
    Then ask the portal to launch an assignment, that already exists in the portal.
    This gives us a redirect URL that we can modify and cypress can visit,
    and then check if things load properly.

    Note this is going to put some bogus data into the report-service-dev database.
    It will have properties that match the portal assignment, but the saved answers
    will be from a different activity. The answersSourceKey is set so this bogus data
    doesn't conflict with any real answers from the portal assignment.
  */
  beforeEach(() => {
    /*
      Cookies should be cleared automatically, but that doesn't seem to happen
      with cy.request to other domains.
      The use of {domain: null} is an undocumented feature that I found here:
      https://github.com/cypress-io/cypress/issues/408
      Without this, the tests will typically pass, but if you leave your cypress browser
      open long enough, then an invalid cookie will be sent when the test is run and
      the login will fail in a strange way. It returns success, but doesn't set a valid
      cookie.
    */
    cy.clearCookies({domain: null});

    const portalDomain = Cypress.env("portal_domain");
    const portalUsername = Cypress.env("portal_username");
    const portalPassword = Cypress.env("portal_password");
    const portalLaunchPath = Cypress.env("portal_launch_path");

    // Login as a student
    cy.request({
      url: `${portalDomain}/api/v1/users/sign_in`,
      method: "POST",
      body: {
        "user[login]": portalUsername,
        "user[password]": portalPassword
      },
      form: true
    })
    .its("status").should("equal", 200);

    // Run an AP assignment, in order to get the params from the portal
    cy.request({
      url: `${portalDomain}${portalLaunchPath}`,
      method: "GET",
      followRedirect: false
    })
    .then((resp) => {
      expect(resp.status).to.eq(302);
      expect(resp.redirectedToUrl).to.match(/^https:\/\/activity-player\.concord\.org/);
      const url = new URL(resp.redirectedToUrl);
      const params = new URLSearchParams(url.search);
      return params.get("token");
    })
    .as("portalToken");

  });

  // A regular 'function' syntax is used instead '=>' so cypress can control what
  // 'this' is
  it("can open a sample activity", function () {
    const portalDomain = Cypress.env("portal_domain");
    const answersSourceKey = Cypress.env("answers_source_key");

    cy.visit(`?activity=sample-activity-1&token=${this.portalToken}` +
      `&domain=${portalDomain}/&answersSourceKey=${answersSourceKey}`);
    cy.get("[data-cy=activity-summary]").should("contain", "Single Page Test Activity");
  });

  // A regular 'function' syntax is used instead '=>' so cypress can control what
  // 'this' is
  it("can work with the interactive sharing plugin", function () {
    const portalDomain = Cypress.env("portal_domain");
    const answersSourceKey = Cypress.env("answers_source_key");

    cy.visit(`?activity=sample-interactive-sharing&token=${this.portalToken}` +
      `&domain=${portalDomain}/&answersSourceKey=${answersSourceKey}`);
    cy.get("[data-cy=activity-summary]").should("contain", "Test Interactive Sharing");
    activityPage.getNavPage(1).click();

    getInIframe("body", "textarea").clear().type("hello world");

    // HACK: This test assumes the interactive has already been shared
    // because this AP is "launched" from the portal it will restore its state each time
    // it is launched. If you are using this with a new portal, class, assignment, or student
    // then you need to share something first by uncommenting the following 3 lines and
    // running the test:
    // cy.get('[data-tip="Share this"]').click();
    // cy.get('body').should("contain", "Your work  has been shared with your class.");
    // cy.get('.share-modal--titleBarContents--SharingPluginV1>svg').eq(1).click();  // click the close button


    cy.get('[data-tip="Stop sharing"]').click();

    cy.get('[data-tip="Share this"]').click();
    cy.get("body").should("contain", "Your work  has been shared with your class.");
    // click the close button
    cy.get(".share-modal--titleBarContents--SharingPluginV1>svg").eq(1).click();

    cy.get('[data-tip="View class work"]').click();
    cy.get(".left-nav--students--SharingPluginV1").eq(0).click();
    cy.get('iframe[src^="https://portal-report.concord.org"]');

  });
});
