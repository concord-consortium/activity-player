import { ChatIdentity, getChatIdentity, shouldShowChat } from "./chat-eligibility";
import { IAnonymousPortalData, IPortalData } from "../../portal-types";

const anon = (runKey: string): IAnonymousPortalData => ({
  type: "anonymous",
  userType: "learner",
  runKey,
  resourceUrl: "https://authoring.concord.org/activities/123",
  toolId: "tool",
  toolUserId: "anonymous",
  database: { appName: "report-service-dev", sourceKey: "auth.concord.org" },
} as unknown as IAnonymousPortalData);

// The offering's activityUrl here is the LAUNCH url the Portal actually stores, copied from a real
// report-service-pro chat doc. The previous fixture used an authoring URL, which no production
// offering ever supplies, and that is what hid the bug the resourceUrl regression test below covers.
const kLaunchUrl =
  "https://activity-player.concord.org/?activity=https%3A%2F%2Fauthoring.concord.org%2Fapi%2Fv1%2Factivities%2F9.json";

const authed = (userType: "teacher" | "learner", learnerKey?: string): IPortalData => ({
  type: "authenticated",
  userType,
  learnerKey,
  platformId: "https://portal.concord.org",
  platformUserId: "555",
  contextId: "class-hash",
  resourceLinkId: "offering-1",
  resourceUrl: "https://authoring.concord.org/activities/9",
  database: { appName: "report-service-dev", sourceKey: "portal.concord.org" },
  offering: { id: 1, activityUrl: kLaunchUrl, rubricUrl: "", locked: false },
} as unknown as IPortalData);

describe("getChatIdentity", () => {
  it("returns null when there is no portal data", () => {
    expect(getChatIdentity(null)).toBeNull();
    expect(getChatIdentity(undefined)).toBeNull();
  });

  it("accepts a real online anonymous run (long run key)", () => {
    const identity = getChatIdentity(anon("a1b2c3d4e5f6g7h8"));
    expect(identity).not.toBeNull();
    expect(identity!.key).toBe("a1b2c3d4e5f6g7h8");
    expect(identity!.ownerFields).toEqual({ run_key: "a1b2c3d4e5f6g7h8" });
    expect(identity!.source).toBe("auth.concord.org");
    expect(identity!.activityUrl).toBe("https://authoring.concord.org/activities/123");
  });

  it("rejects anonymous preview runs and short run keys", () => {
    expect(getChatIdentity(anon("preview"))).toBeNull();
    expect(getChatIdentity(anon("short"))).toBeNull();
  });

  it("accepts an authenticated learner and returns platform owner fields", () => {
    const identity = getChatIdentity(authed("learner", "learner-key-1"));
    expect(identity).not.toBeNull();
    expect(identity!.key).toBe("learner-key-1");
    expect(identity!.ownerFields).toEqual({
      platform_user_id: "555",
      platform_id: "https://portal.concord.org",
      context_id: "class-hash",
    });
    expect(identity!.activityUrl).toBe("https://authoring.concord.org/activities/9");
  });

  it("sends the learner's resourceUrl, never the offering launch url the function would reject", () => {
    // Regression: the function's AUTHORING_HOSTS allowlist rejects activity-player.concord.org, so
    // sending the launch url killed the first turn of every authenticated conversation that opened with
    // a typed message ("disallowed activity host"). A log-first turn resolves the activity from the
    // trusted default host instead, which is why this survived staging and only bit real learners.
    const identity = getChatIdentity(authed("learner", "learner-key-1"));
    expect(identity!.activityUrl).not.toBe(kLaunchUrl);
    expect(new URL(identity!.activityUrl!).hostname).toBe("authoring.concord.org");
  });

  it("rejects authenticated teachers and learners with no learner key", () => {
    expect(getChatIdentity(authed("teacher", "some-key"))).toBeNull();
    expect(getChatIdentity(authed("learner", undefined))).toBeNull();
  });
});

describe("shouldShowChat", () => {
  const identity: ChatIdentity = { source: "s", key: "learner-key-1", ownerFields: { run_key: "r" } };
  // The all-clear baseline: a flagged-on learner on an ordinary content page.
  const eligible = {
    chatEnabled: true,
    idle: false,
    hasError: false,
    isSinglePageActivity: false,
    isContentPage: true,
    isCompletionPage: false,
    identity,
  };

  it("shows chat for a flagged-on learner on a content page", () => {
    expect(shouldShowChat(eligible)).toBe(true);
  });

  it("stays off unless the flag is on", () => {
    expect(shouldShowChat({ ...eligible, chatEnabled: false })).toBe(false);
  });

  it("stays off without a usable identity (teacher / preview / short run key)", () => {
    expect(shouldShowChat({ ...eligible, identity: null })).toBe(false);
  });

  // EXT-2: a single-page activity has no per-page scoping for the conversation to be about.
  it("stays off for a single-page activity", () => {
    expect(shouldShowChat({ ...eligible, isSinglePageActivity: true })).toBe(false);
  });

  // EXT-7: the completion page is not a content page to tutor on.
  it("stays off on the completion page", () => {
    expect(shouldShowChat({ ...eligible, isCompletionPage: true })).toBe(false);
  });

  it("stays off on the activity intro page", () => {
    expect(shouldShowChat({ ...eligible, isContentPage: false })).toBe(false);
  });

  it("stays off behind the idle and error screens", () => {
    expect(shouldShowChat({ ...eligible, idle: true })).toBe(false);
    expect(shouldShowChat({ ...eligible, hasError: true })).toBe(false);
  });
});
