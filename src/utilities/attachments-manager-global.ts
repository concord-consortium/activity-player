import { getFirebaseJWT, getUniqueLearnerString } from "../portal-api";
import { IPortalData, IPortalDataUnion } from "../portal-types";
import { AttachmentsManager } from "./attachments-manager";

let resolveAttachmentsManager: (manager: AttachmentsManager) => void;
export const attachmentsManager = new Promise<AttachmentsManager>((resolve, reject) => {
  resolveAttachmentsManager = resolve;
});

export const initializeAttachmentsManager = async (portalData: IPortalDataUnion) => {
  resolveAttachmentsManager(await createAttachmentsManager(portalData));
};

export const createAttachmentsManager = async (portalData: IPortalDataUnion) => {
  const learnerId = getUniqueLearnerString(portalData);
  const { basePortalUrl, rawPortalJWT } = portalData as IPortalData;
  let firebaseJwt: string | undefined;
  if (basePortalUrl && rawPortalJWT) {
    const queryParams = { firebase_app: "token-service" };
    [firebaseJwt] = await getFirebaseJWT(basePortalUrl, rawPortalJWT, queryParams);
  }
  return new AttachmentsManager(learnerId, firebaseJwt);
};
