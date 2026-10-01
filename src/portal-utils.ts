import { getFirebaseJWT } from "./portal-api";
import { getPortalJWTManager } from "./portal-jwt-manager";
import { IPortalData } from "./portal-types";

export interface IHandleGetFirebaseJWTParams extends Record<string, any> {
  firebase_app: string;
}
export const handleGetFirebaseJWT = async (params: IHandleGetFirebaseJWTParams, portalData?: IPortalData) => {
  const portalJWTManager = getPortalJWTManager();
  if (portalData?.basePortalUrl && portalJWTManager) {
    const { learnerKey, basePortalUrl } = portalData;
    const _learnerKey = learnerKey ? { learner_id_or_key: learnerKey } : undefined;
    const [rawFirebaseJWT] = await portalJWTManager.withToken(
      rawPortalJWT => getFirebaseJWT(basePortalUrl, rawPortalJWT, { ...params, ..._learnerKey }));
    return rawFirebaseJWT;
  }
  throw new Error("Error retrieving Firebase JWT!");
};
