import { EnvironmentName } from "@concord-consortium/token-service";
import { firebaseAppName, getFirebaseJWT, isAnonymousPortalData } from "../portal-api";
import { IPortalData, IPortalDataUnion } from "../portal-types";

export const getAttachmentsManagerOptions = async (portalData: IPortalDataUnion) => {
  const { basePortalUrl, rawPortalJWT } = portalData as IPortalData;
  let firebaseJwt: string | undefined;
  if (basePortalUrl && rawPortalJWT) {
    const queryParams = { firebase_app: "token-service" };
    [firebaseJwt] = await getFirebaseJWT(basePortalUrl, rawPortalJWT, queryParams);
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
