import ActivityPage from "../support/elements/activity-page";
import Chat from "../support/elements/chat";

const activityPage = new ActivityPage;
const chat = new Chat;

// Coverage for the assembled showChat gate in app.tsx. Its helpers (resolveChatEnabled,
// getChatIdentity, shouldShowChat) have unit tests, but the composed behaviour that actually enforces
// EXT-2 (no chat on single-page activities) and EXT-7 (no chat on the completion page) had none.
//
// Two flags matter here and both are deliberate:
//   - `chatDebug` forces the no-backend DebugTransport. WITHOUT it a bundled sample takes the LIVE
//     transport, because the debug fallback keys off `!identity.activityUrl` and getResourceUrl()
//     returns the sample NAME (truthy, not empty). A live run would write real chat docs to
//     report-service-dev and bill an OpenAI turn per forwarded log, from CI.
//   - `preview` is NOT used. Anonymous preview runs resolve to no chat identity at all (the run key is
//     literally "preview", which getChatIdentity rejects), so the gate would be off for the wrong
//     reason and every assertion below would pass vacuously.
const chatUrl = (activity: string, extra = "") =>
  `?activity=${activity}&chat=true&chatDebug=true${extra}`;

context("Chat tutor sidebar gate", () => {
  describe("the ?chat flag", () => {
    it("does not render the launcher without the flag", () => {
      cy.visit("?activity=sample-activity-1");
      activityPage.getPage(2).click();
      activityPage.getPageContent().should("be.visible"); // page rendered, so absence below is real
      chat.getLauncher().should("not.exist");
    });

    it("does not render the launcher for ?chat=false", () => {
      cy.visit("?activity=sample-activity-1&chat=false&chatDebug=true");
      activityPage.getPage(2).click();
      activityPage.getPageContent().should("be.visible");
      chat.getLauncher().should("not.exist");
    });

    it("renders the launcher on a content page with the flag", () => {
      cy.visit(chatUrl("sample-activity-1"));
      activityPage.getPage(2).click();
      chat.getLauncher().should("be.visible");
    });
  });

  describe("page-level exclusions", () => {
    it("does not render the launcher on the activity intro page", () => {
      // The intro page is currentPage === 0: a real page of the activity, but not a content page to
      // tutor on. Landing here is the default, so no navigation is needed.
      cy.visit(chatUrl("sample-activity-1"));
      activityPage.getPagesHeader().should("be.visible"); // we really are on the intro page
      chat.getLauncher().should("not.exist");
    });

    it("does not render the launcher on the completion page (EXT-7)", () => {
      cy.visit(chatUrl("sample-activity-1"));
      activityPage.getPage(2).click();
      chat.getLauncher().should("be.visible"); // present first, so its absence below is the gate
      // .first(): the completion-page button is rendered in both the top and bottom nav.
      activityPage.getCompletionPage().first().click();
      chat.getLauncher().should("not.exist");
    });

    it("does not render the launcher on a single-page activity (EXT-2)", () => {
      // A single-page layout has no per-page scoping for a conversation to be about.
      cy.visit(chatUrl("sample-activity-single-page-layout"));
      chat.getLauncher().should("not.exist");
    });
  });

  describe("opening and closing the drawer", () => {
    beforeEach(() => {
      cy.visit(chatUrl("sample-activity-1"));
      activityPage.getPage(2).click();
    });

    it("opens the drawer from the launcher and closes it again", () => {
      chat.getSidebar().should("not.exist");
      chat.getLauncher().click();
      chat.getSidebar().should("be.visible");
      chat.getHeader().should("contain", "Ask the Tutor");
      chat.getComposer().should("be.visible");
      // NOT chat-empty: DebugTransport seeds the would-be system prompt as an opening turn, so the
      // empty state never renders in a dry run. The seeded turn is collapsed, so assert the toggle
      // and expand it to reach the dry-run text.
      chat.getDebugBody().should("not.exist");
      chat.getDebugToggle().click();
      chat.getDebugBody().should("contain", "local dry run");

      chat.getCloseButton().click();
      chat.getSidebar().should("not.exist");
      chat.getLauncher().should("be.visible"); // launcher comes back, so the chat is re-openable
    });

    it("swaps the conversation when the student navigates to another page", () => {
      // The transport is re-keyed per activityId + pageId, so navigating away is a hard conversation
      // swap rather than a carried-over thread.
      chat.getLauncher().click();
      chat.getInput().type("scoped to page two{enter}");
      chat.getUserRows().should("contain", "scoped to page two");

      // getNavPageButton, not getPage: [data-cy=activity-page-links] only exists on the intro page,
      // so getPage() cannot move between content pages. sample-activity-1 has exactly two content
      // pages plus a completion page, so index 0 (page one) is the only other page to move to.
      // The panel also re-closes on navigation, hence the second launcher click.
      activityPage.getNavPageButton(0).click();
      chat.getLauncher().click();
      chat.getUserRows().should("not.exist");        // the page-two message did not follow us
      chat.getDebugToggle().should("be.visible");    // a fresh conversation, freshly seeded
    });
  });
});
