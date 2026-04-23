import ActivityPage from "../support/elements/activity-page";

const activityPage = new ActivityPage();

const kV3Base = "https://codap3.concord.org";

const kV2DirectUrl =
  "https://codap.concord.org/app/static/dg/en/cert/index.html" +
  "?interactiveApi&documentId=https%3A%2F%2Fcfm-shared.concord.org%2FTIB2fm6urfelkV2ydJBr%2Ffile.json";

const kV3ExpectedDirectUrl =
  "https://codap3.concord.org" +
  "?interactiveApi&documentId=https%3A%2F%2Fcfm-shared.concord.org%2FTIB2fm6urfelkV2ydJBr%2Ffile.json";

const kFullScreenWrapperPath = "models-resources.concord.org/question-interactives/full-screen/";

const getIframeSrc = () => activityPage.getInteractive().find("iframe").invoke("attr", "src");

context("CODAP URL override (`codap` URL parameter)", () => {
  describe("direct CODAP V2 URL (sample-activity-codap)", () => {
    it("passes through the URL unchanged when the `codap` param is absent", () => {
      cy.visit("?activity=sample-activity-codap&preview&page=1");
      getIframeSrc().should("eq", kV2DirectUrl);
    });

    it("rewrites the URL to the supplied V3 base when `codap` is set", () => {
      cy.visit(`?activity=sample-activity-codap&preview&page=1&codap=${kV3Base}`);
      getIframeSrc().should("eq", kV3ExpectedDirectUrl);
    });
  });

  describe("CODAP V2 URL wrapped in a full-screen question interactive (sample-activity-codap-full-screen)", () => {
    it("passes through the outer URL unchanged when the `codap` param is absent", () => {
      cy.visit("?activity=sample-activity-codap-full-screen&preview&page=1");
      getIframeSrc()
        .should("include", kFullScreenWrapperPath)
        .and("include", "wrappedInteractive=https%3A%2F%2Fcodap.concord.org");
    });

    it("rewrites the inner CODAP V2 URL inside `wrappedInteractive` when `codap` is set", () => {
      cy.visit(
        `?activity=sample-activity-codap-full-screen&preview&page=1&codap=${kV3Base}`
      );
      getIframeSrc()
        .should("include", kFullScreenWrapperPath)
        .and("include", "wrappedInteractive=https%3A%2F%2Fcodap3.concord.org")
        .and("not.include", "wrappedInteractive=https%3A%2F%2Fcodap.concord.org");
    });
  });
});
