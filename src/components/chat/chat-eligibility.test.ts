import { getChatIdentity } from "./chat-eligibility";
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

const authed = (userType: "teacher" | "learner", learnerKey?: string): IPortalData => ({
  type: "authenticated",
  userType,
  learnerKey,
  platformId: "https://portal.concord.org",
  platformUserId: "555",
  contextId: "class-hash",
  resourceLinkId: "offering-1",
  database: { appName: "report-service-dev", sourceKey: "portal.concord.org" },
  offering: { id: 1, activityUrl: "https://authoring.concord.org/activities/9.json", rubricUrl: "", locked: false },
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
    expect(identity!.activityUrl).toBe("https://authoring.concord.org/activities/9.json");
  });

  it("rejects authenticated teachers and learners with no learner key", () => {
    expect(getChatIdentity(authed("teacher", "some-key"))).toBeNull();
    expect(getChatIdentity(authed("learner", undefined))).toBeNull();
  });
});
