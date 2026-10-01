import { IAttachmentsManagerInitOptions } from "@concord-consortium/interactive-api-host";
import { EnvironmentName } from "@concord-consortium/token-service";
import { firebaseAppName, getFirebaseJWT, isAnonymousPortalData } from "../portal-api";
import { getPortalJWTManager } from "../portal-jwt-manager";
import { IPortalData, IPortalDataUnion } from "../portal-types";

export const getAttachmentsManagerOptions = async (portalData: IPortalDataUnion): Promise<IAttachmentsManagerInitOptions> => {

  const { basePortalUrl } = portalData as IPortalData;
  const portalJWTManager = getPortalJWTManager();
  let firebaseJwt: string | undefined;
  if (basePortalUrl && portalJWTManager) {
    const queryParams = { firebase_app: "token-service" };
    [firebaseJwt] = await portalJWTManager.withToken(rawPortalJWT => getFirebaseJWT(basePortalUrl, rawPortalJWT, queryParams));
  }
  return {
    tokenServiceFirestoreJWT: firebaseJwt,
    tokenServiceEnv: firebaseAppName() === "report-service-pro" ? "production" : "staging" as EnvironmentName,
    writeOptions: {
      runKey: isAnonymousPortalData(portalData) ? portalData.runKey : undefined,
      runRemoteEndpoint: isAnonymousPortalData(portalData) ? undefined : portalData.runRemoteEndpoint
    }
  };
};
