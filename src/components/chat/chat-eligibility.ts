// Identity gate + path inputs for live chat.
//
// The conversation `{key}` is `learnerKey ?? runKey`. `learnerKey` is populated only for
// authenticated learners; teachers/researchers have no valid `{key}` and every chat write is
// rejected by both rule branches. Anonymous PREVIEW runs go offline (disableNetwork()) so the
// trigger never fires — and "preview" is too short for the anonymous rules (`run_key` > 10 chars).
// So live chat is for authenticated learners and real online anonymous runs ONLY.
import { IPortalData, IAnonymousPortalData } from "../../portal-types";

// Owner fields carried on every browser-written chat doc — the same identity fields `answers` docs
// carry (snake_case, value-checked against the auth token by the Firestore rules).
export interface ChatOwnerFields {
  run_key?: string;
  platform_user_id?: string;
  platform_id?: string;
  context_id?: string;
}

export interface ChatIdentity {
  source: string;              // {source} = database.sourceKey
  key: string;                 // {key} = learnerKey ?? runKey
  ownerFields: ChatOwnerFields;
  activityUrl?: string;        // public activity/sequence URL the function fetches server-side
}

const kMinRunKeyLength = 10; // anonymousCreate() requires run_key > 10 chars

export function getChatIdentity(
  portalData: IPortalData | IAnonymousPortalData | null | undefined
): ChatIdentity | null {
  if (!portalData) return null;

  if (portalData.type === "anonymous") {
    const runKey = portalData.runKey;
    // Exclude preview (offline; "preview" is also too short) and any too-short run key.
    if (!runKey || runKey === "preview" || runKey.length <= kMinRunKeyLength) return null;
    return {
      source: portalData.database.sourceKey,
      key: runKey,
      ownerFields: { run_key: runKey },
      activityUrl: portalData.resourceUrl,
    };
  }

  // authenticated: learners only
  if (portalData.userType !== "learner" || !portalData.learnerKey) return null;
  return {
    source: portalData.database.sourceKey,
    key: portalData.learnerKey,
    ownerFields: {
      platform_user_id: portalData.platformUserId?.toString(),
      platform_id: portalData.platformId,
      context_id: portalData.contextId,
    },
    activityUrl: portalData.offering?.activityUrl,
  };
}
