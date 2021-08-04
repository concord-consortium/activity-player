import { getFirebaseJWT } from "./portal-api";
import { IPortalData } from "./portal-types";

export interface IHandleGetFirebaseJWTParams extends Record<string, any> {
  firebase_app: string;
}
export const handleGetFirebaseJWT = async (params: IHandleGetFirebaseJWTParams, portalData?: IPortalData) => {
  if (portalData?.basePortalUrl && portalData.rawPortalJWT) {
    const { learnerKey, basePortalUrl, rawPortalJWT } = portalData;
    const _learnerKey = learnerKey ? { learner_id_or_key: learnerKey } : undefined;
    const [rawFirebaseJWT] = await getFirebaseJWT(basePortalUrl, rawPortalJWT, { ...params, ..._learnerKey });
    return rawFirebaseJWT;
  }
  throw new Error("Error retrieving Firebase JWT!");
};
