import { FirebaseAppName } from "./firebase-db";
import { RawClassInfo } from "./portal-api";

export interface ILTIPartial {
  platformId: string;      // portal
  platformUserId: string;
  contextId: string;       // class hash
  resourceLinkId: string;  // offering ID
}

export interface OfferingData {
  id: number;
  activityUrl: string;
  rubricUrl: string;
}
interface FirebaseData {
  appName: FirebaseAppName;
  sourceKey: string;
  rawFirebaseJWT: string;
}

interface BasePortalJWT {
  alg: string;
  iat: number;
  exp: number;
  uid: number;
}

interface PortalStudentJWT extends BasePortalJWT {
  domain: string;
  user_type: "learner";
  user_id: string;
  learner_id: number;
  class_info_url: string;
  offering_id: number;
}

export type PortalJWT = PortalStudentJWT;     // eventually may include other user types

export interface IPortalData extends ILTIPartial {
  type: "authenticated";
  offering: OfferingData;
  userType: "teacher" | "learner";
  database: FirebaseData;
  toolId: string;
  resourceUrl: string;
  fullName?: string;
  learnerKey?: string;
  basePortalUrl?: string;
  rawPortalJWT?: string;
  portalJWT?: PortalJWT;
  runRemoteEndpoint: string;
  rawClassInfo: RawClassInfo;
  collaboratorsDataUrl?: string;
  teacherFeedbackSourceKey?: string;
}

export const isPortalData = (data: any): data is IPortalData => {
  return data.type === "authenticated";
};

export interface IAnonymousPortalData {
  type: "anonymous";
  userType: "learner";
  runKey: string;
  resourceUrl: string;
  toolId: string;
  toolUserId: "anonymous";
  database: {
    appName: FirebaseAppName;
    sourceKey: string;
  };
}

export type IPortalDataUnion = IPortalData | IAnonymousPortalData;
