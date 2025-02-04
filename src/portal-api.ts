import jwt from "jsonwebtoken";
import superagent from "superagent";
import { v4 as uuidv4 } from "uuid";
import { queryValue, setQueryValue } from "./utilities/url-query";
import { FirebaseAppName } from "./firebase-db";
import { getResourceUrl } from "./lara-api";
import { IAnonymousPortalData, IPortalData, OfferingData, PortalJWT } from "./portal-types";
import { getCanonicalHostname, isProductionOrigin } from "./utilities/host-utils";

interface PortalClassOffering {
  className: string;
  problemOrdinal: string;
  unitCode: string;
  offeringId: string;
  location: string;
}

interface RawUser {
  id: string;
  first_name: string;
  last_name: string;
}

interface User {
  id: string;
  portal: string;
  firstName: string;
  lastName: string;
  fullName: string;
  className: string;
  classHash: string;
  offeringId: string;
  portalJWT?: PortalJWT;
  rawPortalJWT?: string;
  firebaseJWT?: PortalFirebaseJWT;
  rawFirebaseJWT?: string;
  portalClassOfferings?: PortalClassOffering[];
}

interface StudentUser extends User {
  type: "student";
}

export interface TeacherUser extends User {
  type: "teacher";
}

export type AuthenticatedUser = StudentUser | TeacherUser;

export interface IOffering {
  id: number;
  name: string;
  url: string;
}

export interface RawClassInfo {
  id: number;
  uri: string;
  name: string;
  state: string;
  class_hash: string;
  teachers: RawUser[];
  students: RawUser[];
  offerings: IOffering[];
}

interface ClassInfo {
  name: string;
  classHash: string;
  students: StudentUser[];
  teachers: TeacherUser[];
}

interface BasePortalFirebaseJWT {
  alg: string;
  iss: string;
  sub: string;
  aud: string;
  iat: number;
  exp: number;
  uid: string;
  user_id: string;
}

interface PortalFirebaseJWTStudentClaims {
  user_type: "learner";
  user_id: string;
  class_hash: string;
  offering_id: number;
  platform_id: string;
  platform_user_id: string;
}

interface PortalFirebaseStudentJWT extends BasePortalFirebaseJWT {
  domain: string;
  domain_uid: number;
  externalId: number;
  returnUrl: string;
  logging: boolean;
  class_info_url: string;
  claims: PortalFirebaseJWTStudentClaims;
}

type PortalFirebaseJWT = PortalFirebaseStudentJWT;   // eventually may include other user types

const PORTAL_JWT_URL_SUFFIX = "api/v1/jwt/portal";
const FIREBASE_JWT_URL_SUFFIX = "api/v1/jwt/firebase";
const OFFERING_URL_SUFFIX = "api/v1/offerings";

const getErrorMessage = (err: any, res: superagent.Response) => {
  // The response should always be non-null, per the typedef and documentation:
  // cf. https://visionmedia.github.io/superagent/#error-handling
  // However, Rollbar has reported errors due to undefined responses
  // Using err.status or err.response, per the above link, may be preferable here
  return (res?.body ? res.body.message : null) || err;
};

const parseUrl = (url: string) => {
  const parser = document.createElement("a");
  parser.href = url;
  return parser;
};

const getStudentLearnerKey = (portalJWT: PortalJWT, firebaseJWT: PortalFirebaseJWT) => {
  // Currently for students, the learnerKey is the last part of the returnUrl of the firebaseJWT.
  // The returnUrl field is deprecated, however, so there will presumably be another means of
  // getting the learnerKey down the road, possibly from the portalJWT.
  return firebaseJWT?.returnUrl.split("/").pop();
};

const getPortalJWTWithBearerToken = (basePortalUrl: string, rawToken: string) => {
  return new Promise<[string, PortalJWT]>((resolve, reject) => {
    const basePortalUrlWithTrailingSlash = basePortalUrl.endsWith("/") ? basePortalUrl : `${basePortalUrl}/`;
    const url = `${basePortalUrlWithTrailingSlash}${PORTAL_JWT_URL_SUFFIX}`;
    superagent
      .get(url)
      .set("Authorization", `Bearer ${rawToken}`)
      .end((err, res) => {
        if (err) {
          reject(getErrorMessage(err, res));
        } else if (!res.body || !res.body.token) {
          reject("No token found in JWT request response");
        } else {
          const rawJWT = res.body.token;
          const portalJWT = jwt.decode(rawJWT);
          if (portalJWT) {
            resolve([rawJWT, portalJWT as PortalJWT]);
          } else {
            reject("Invalid portal token");
          }
        }
      });
  });
};

// The default firebase app name is based on the URL:
// only [production-origin] with no path defaults to report-service-pro
// everything else defaults to report-service-dev
//
// The default can be overridden with a firebaseApp URL param
//
// A memoized function is used here so we don't compute the app name until it is
// actually needed. This will be useful if we start supporting OAuth where the
// initially loaded parameters would change before firestore is initialized.
// A full dynamic function is a little risky since some data might go to two
// different databases which would be difficult to debug.
let _firebaseAppName: FirebaseAppName | null = null;
export const firebaseAppName = ():FirebaseAppName => {
  if (_firebaseAppName) {
    return _firebaseAppName;
  }

  const firebaseAppParam = queryValue("firebaseApp");
  if (firebaseAppParam === "report-service-pro" ||
      firebaseAppParam === "report-service-dev") {
    _firebaseAppName = firebaseAppParam as FirebaseAppName;
    return _firebaseAppName;
  }

  const { origin, pathname } = window.location;
  // According to the spec an empty path like https://activity-player.concord.org
  // will still have a pathname of "/", but just to be safe this checks for the
  // falsey pathname
  if(isProductionOrigin(origin) &&
     (!pathname || pathname === "/")) {
    _firebaseAppName = "report-service-pro";
  } else {
    _firebaseAppName = "report-service-dev";
  }

  return _firebaseAppName;
};

// this is used for testing purposes
export const clearFirebaseAppName = () => {
  _firebaseAppName = null;
};

const getActivityPlayerFirebaseJWT = (basePortalUrl: string, rawPortalJWT: string, classHash?: string) => {
  const _classHash = classHash ? { class_hash: classHash } : undefined;
  const queryParams = { firebase_app: firebaseAppName(), ..._classHash };
  return getFirebaseJWT(basePortalUrl, rawPortalJWT, queryParams);
};

export const getFirebaseJWT = (basePortalUrl: string, rawPortalJWT: string,
                                queryParams: Record<string, string>) => {
  return new Promise<[string, PortalFirebaseJWT]>((resolve, reject) => {
    const url = `${basePortalUrl}${FIREBASE_JWT_URL_SUFFIX}`;
    superagent
      .get(url)
      .query(queryParams)
      .set("Authorization", `Bearer/JWT ${rawPortalJWT}`)
      .end((err, res) => {
        if (err) {
          reject(getErrorMessage(err, res));
        }
        else if (!res.body || !res.body.token) {
          reject("No Firebase token found in Firebase JWT request response");
        }
        else {
          const {token} = res.body;
          const firebaseJWT = jwt.decode(token);
          if (firebaseJWT) {
            resolve([token, firebaseJWT as PortalFirebaseJWT]);
          }
          else {
            reject("Invalid Firebase token");
          }
        }
      });
  });
};

interface GetClassInfoParams {
  classInfoUrl: string;
  rawPortalJWT: string;
  portal: string;
  offeringId: string;
}

const getClassInfo = (params: GetClassInfoParams) => {
  const {classInfoUrl, rawPortalJWT, portal, offeringId} = params;
  return new Promise<{ classInfo: ClassInfo, rawClassInfo: RawClassInfo }>((resolve, reject) => {
    superagent
    .get(classInfoUrl)
    .set("Authorization", `Bearer/JWT ${rawPortalJWT}`)
    .end((err, res) => {
      if (err) {
        reject(getErrorMessage(err, res));
      } else if (!res.body || !res.body.class_hash) {
        reject("Invalid class info response");
      } else {
        const rawClassInfo: RawClassInfo = res.body;

        const classInfo: ClassInfo = {
          // id: rawClassInfo.id,
          name: rawClassInfo.name,
          classHash: rawClassInfo.class_hash,
          students: rawClassInfo.students.map((rawStudent) => {
            const fullName = `${rawStudent.first_name} ${rawStudent.last_name}`;
            const id = rawStudent.id.split("/").pop() || "0";
            const student: StudentUser = {
              type: "student",
              id,
              portal,
              firstName: rawStudent.first_name,
              lastName: rawStudent.last_name,
              fullName,
              className: rawClassInfo.name,
              classHash: rawClassInfo.class_hash,
              offeringId,
            };
            return student;
          }),
          teachers: rawClassInfo.teachers.map((rawTeacher) => {
            const fullName = `${rawTeacher.first_name} ${rawTeacher.last_name}`;
            const id = rawTeacher.id.split("/").pop() || "0";
            const teacher: TeacherUser = {
              type: "teacher",
              id,
              portal,
              firstName: rawTeacher.first_name,
              lastName: rawTeacher.last_name,
              fullName,
              className: rawClassInfo.name,
              classHash: rawClassInfo.class_hash,
              offeringId,
            };
            return teacher;
          }),
        };

        resolve({ classInfo, rawClassInfo });
      }
    });
  });
};

interface GetOfferingParams {
  portalJWT: PortalJWT;
  rawPortalJWT: string;
  offeringId: string;
}

export const getOfferingData = (params: GetOfferingParams) => {
  const {portalJWT, rawPortalJWT, offeringId} = params;

  const offeringUrl = `${portalJWT.domain}${OFFERING_URL_SUFFIX}/${offeringId}`;
  return new Promise<OfferingData>((resolve, reject) => {
    superagent
    .get(offeringUrl)
    .set("Authorization", `Bearer/JWT ${rawPortalJWT}`)
    .end((err, res) => {
      if (err) {
        reject(getErrorMessage(err, res));
      } else if (!res.body || !res.body.activity_url) {
        reject("Invalid offering response");
      } else {
        const rawOffering: any = res.body;
        const offeringData: OfferingData = {
          id: rawOffering.id,
          activityUrl: rawOffering.activity_url,
          rubricUrl: rawOffering.rubric_url,
          locked: !!rawOffering.locked,
        };
        resolve(offeringData);
      }
    });
  });
};

export const fetchPortalJWT = async (bearerToken: string) => {
  const basePortalUrl = getBasePortalUrl();

  if (!bearerToken || !basePortalUrl) {
    throw new Error("No token provided for authentication (must launch from Portal)");
  }

  const [rawPortalJWT, portalJWT] = await getPortalJWTWithBearerToken(basePortalUrl, bearerToken);
  return { rawPortalJWT, portalJWT };
};

export const fetchPortalData = async (rawPortalJWT: string, portalJWT: PortalJWT): Promise<IPortalData> => {
  if (portalJWT.user_type !== "learner") {
    throw new Error("Only student logins are currently supported");
  }

  const basePortalUrl = getBasePortalUrl();

  if (!basePortalUrl) {
    throw new Error("Missing base Portal URL, it should be provided using domain or auth-domain URL param");
  }

  const portal = parseUrl(basePortalUrl).host;

  const classInfoUrl = portalJWT.class_info_url;
  const offeringId = `${portalJWT.offering_id}`;

  if (!classInfoUrl || !offeringId) {
    throw new Error("Unable to get classInfoUrl or offeringId");
  }

  const { classInfo, rawClassInfo } = await getClassInfo({classInfoUrl, rawPortalJWT, portal, offeringId});
  const offeringData = await getOfferingData({portalJWT, rawPortalJWT, offeringId});
  const [rawFirebaseJWT, firebaseJWT] = await getActivityPlayerFirebaseJWT(basePortalUrl, rawPortalJWT, classInfo.classHash);

  // student data gets saved in different buckets of the DB, the "source," depending on the domain
  // of the activity.
  // This works fine, but for testing the activity player, we may want to load data that was previously
  // saved in a different domain (e.g. authoring.concord.org), so we first check for a "url-source"
  // query parameter.
  const sourceKey = queryValue("answersSourceKey") || parseUrl(offeringData.activityUrl.toLowerCase()).hostname;

  // teacher feedback is saved in a different bucket
  const resourceUrl = getResourceUrl();
  const teacherFeedbackSourceKey = parseUrl(resourceUrl.toLowerCase()).hostname;

  // for the tool id we want to distinguish activity-player branches, incase this is ever helpful for
  // dealing with mis-matched data when we load data in originally saved on another branch.
  // This is currently unused for the purpose of saving and loading data
  const toolId = window.location.hostname + window.location.pathname;
  const fullName = classInfo.students.find(s => s.id.toString() === portalJWT.uid.toString())?.fullName;

  const rawPortalData: IPortalData = {
    type: "authenticated",
    offering: offeringData,
    resourceLinkId: offeringData.id.toString(),
    userType: firebaseJWT.claims.user_type,
    platformId: firebaseJWT.claims.platform_id,
    platformUserId: firebaseJWT.claims.platform_user_id.toString(),
    contextId: classInfo.classHash,
    rawClassInfo,
    toolId,
    resourceUrl: getResourceUrl(),
    fullName,
    learnerKey: firebaseJWT.claims.user_type === "learner"
                  ? getStudentLearnerKey(portalJWT, firebaseJWT)
                  : undefined,
    basePortalUrl,
    rawPortalJWT,
    portalJWT,
    database: {
      appName: firebaseAppName(),
      sourceKey,
      rawFirebaseJWT,
    },
    runRemoteEndpoint: firebaseJWT.returnUrl,
    collaboratorsDataUrl: queryValue("collaborators_data_url"),
    teacherFeedbackSourceKey
  };

  return rawPortalData;
};

// metadata for saving and loading work for anonymous users, not actually loaded from the portal
export const anonymousPortalData = (preview: boolean) => {
  let runKey;
  if (preview) {
    // Set runKey to any value, it'll be saved only locally in offline Firestore.
    runKey = "preview";
  } else {
    runKey = queryValue("runKey");
    if (!runKey) {
      runKey = uuidv4();
      setQueryValue("runKey", runKey);
    }
  }

  const hostname = window.location.hostname;
  const toolId = hostname + window.location.pathname;
  const rawPortalData: IAnonymousPortalData = {
    type: "anonymous",
    userType: "learner",
    runKey,
    resourceUrl: getResourceUrl(),
    toolId,
    toolUserId: "anonymous",
    database: {
      appName: firebaseAppName(),
      sourceKey: getCanonicalHostname()
    }
  };
  return rawPortalData;
};

export const isAnonymousPortalData = (portalData: IPortalData | IAnonymousPortalData): portalData is IAnonymousPortalData =>
              (portalData as any)?.runKey != null;

export const getUniqueLearnerString = (portalData: IPortalData | IAnonymousPortalData) => {
  return isAnonymousPortalData(portalData)
          ? portalData.runKey
          : portalData.runRemoteEndpoint;
};

export const getBasePortalUrl = () => {
  return queryValue("domain") || queryValue("auth-domain");
};
