import { IAttachmentsManagerInitOptions } from "@concord-consortium/interactive-api-host";
import { EnvironmentName } from "@concord-consortium/token-service";
import { firebaseAppName, isAnonymousPortalData, refreshTokenServiceJWT } from "../portal-api";
import { getPortalJWTManager } from "../portal-jwt-manager";
import { IPortalData, IPortalDataUnion } from "../portal-types";

export const getAttachmentsManagerOptions = (portalData: IPortalDataUnion): IAttachmentsManagerInitOptions => {
  const { basePortalUrl } = portalData as IPortalData;
  const portalJWTManager = getPortalJWTManager();
  const getTokenServiceFirestoreJWT = basePortalUrl && portalJWTManager
    ? () => portalJWTManager.withToken(raw => refreshTokenServiceJWT(basePortalUrl, raw)).then(([token]) => token)
    : undefined;
  return {
    getTokenServiceFirestoreJWT,
    tokenServiceEnv: firebaseAppName() === "report-service-pro" ? "production" : "staging" as EnvironmentName,
    writeOptions: {
      runKey: isAnonymousPortalData(portalData) ? portalData.runKey : undefined,
      runRemoteEndpoint: isAnonymousPortalData(portalData) ? undefined : portalData.runRemoteEndpoint
    }
  };
};
