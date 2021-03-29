import { fetchPortalData, IPortalData } from "./portal-api";
import { IStorageInterface } from "./storage/storage-facade";

export const DEFAULT_STUDENT_NAME = "Anonymous";
export const DEFAULT_STUDENT_LOGGING_USERNAME = "0@anonymous";

const DEFAULT_TEACHER_NAME = "A teacher";
const STUDENT_LOCAL_STORAGE_KEY = "ActivityPlayerStudent";
const DEFAULT_CLASS_HASH = ""; // From `app.tsx` 2021-02-25
const DEFAULT_RUN_REMOTE_ENDPOINT= ""; // From `app.tsx` 2021-02-25


export enum Role { "student", "teacher", "unknown"}

/*
The purpose of this class is to allow us to reconcile users and their data
at a later time.
*/

interface IAnonymousRun {
  activityUrl: string,
  runKey: string,
}

interface IPortalRun extends IAnonymousRun {
  offeringId: string,
  runRemoteEndpoint: string,
  learnerKey: string,
  className: string,
  classID: string,
  contextID: string
}

type Run = IAnonymousRun | IPortalRun;



interface IStudentRecord {
  name: string,
  loggingUsername: string;
  role: Role,
  teacherName: string,
  platformUserId: string,
  runs: Array<Run>,
  platformId?: string
  rawPortalData?: IPortalData
}

export class StudentInfo implements IStudentRecord {
  name: string;
  loggingUsername: string;
  teacherName: string;
  platformUserId: string;
  role: Role;
  runs: Run[];
  rawPortalData: IPortalData;
  dataReady: boolean;
  storage: IStorageInterface|null;
  preview: boolean;
  private _validTokens: boolean;

  constructor(storage: IStorageInterface) {
    // Start with defaults.
    // Calling async operation init() will load real values.
    this.storage = storage;
    this.loadDefaults();
  }

  private loadDefaults() {
    this.role = Role.student;
    this.name = DEFAULT_STUDENT_NAME;
    this.loggingUsername = DEFAULT_STUDENT_LOGGING_USERNAME;
    this.teacherName = DEFAULT_TEACHER_NAME;
    this._validTokens = false;
  }

  public init(): Promise<void> {
    return fetchPortalData({includeClassData: true})
      .then( (portalData: IPortalData) => this.updateFromPortalData(portalData))
      .catch( () => this.updateFromIndexedDB());
  }

  public isAuthenticated() : boolean{
    return this._validTokens === true;
  }

  // TODO: Anonymous users can also send data ...
  public canSendData() : boolean {
    return this.isAuthenticated();
  }

  public canChangeName() : boolean {
    return (! (this.platformUserId && this.platformUserId.length >= 1));
  }

  public hasValidTeacherName() : boolean{
    return this.teacherName !== DEFAULT_TEACHER_NAME;
  }

  public hasValidStudentName() {
    return this.name !== DEFAULT_STUDENT_NAME;
  }

  public getClassHash() {
    return this.rawPortalData?.contextId ?? DEFAULT_CLASS_HASH;
  }

  public getRunRemoteEndpoint() {
    return this.rawPortalData?.runRemoteEndpoint ?? DEFAULT_RUN_REMOTE_ENDPOINT;
  }

  public setName(newName: string) {
    if(this.platformUserId && this.platformUserId.length >= 1) {
      // Cant change an authenticated students name
      return false;
    }
    else {
      this.name=newName;
      window.localStorage.setItem(STUDENT_LOCAL_STORAGE_KEY, this.serializeData());
      return true;
    }
  }

  private validateSerializedData(data: IStudentRecord) {
    // TODO: More careful inspection
    return (
      (data.name?.length >= 1) &&
      (data.teacherName?.length >= 1)
    );
  }

  private updateFromIndexedDB() {
    // We have to load any data we can from the DB, but tokens will be stale.
    // TODO: remove stale tokens if the exist
    console.log("LOADING FROM LOCAL STORAGE");
    const localStorageStudentInfo = localStorage.getItem(STUDENT_LOCAL_STORAGE_KEY) ?? "{}";
    this.loadSerializedData(localStorageStudentInfo);
    this._validTokens=false;
  }

  private loadSerializedData(json: string) : boolean{
    try {
      const data: IStudentRecord = JSON.parse(json) as IStudentRecord;
      if(this.validateSerializedData(data)) {
        this.loadData(data);
        return true;
      }
    } catch (e) {
      console.error("Failed to load serialized student data");
      console.error(e);
    }
    return false;
  }

  private serializeData() {
    const data: IStudentRecord =  {
      name: this.name,
      loggingUsername: this.loggingUsername,
      role: this.role,
      teacherName: this.teacherName,
      platformUserId: this.platformUserId,
      runs: this.runs,
      rawPortalData: this.rawPortalData
    };
    return JSON.stringify(data);
  }

  private loadData(data: IStudentRecord ) {
    this.name = data.name ?? DEFAULT_STUDENT_NAME;
    this.loggingUsername = data.loggingUsername ?? DEFAULT_STUDENT_LOGGING_USERNAME;
    this.teacherName = data.name ?? DEFAULT_TEACHER_NAME;
    this.platformUserId = data.platformUserId;
    this.runs = data.runs;
    this.role = data.role;
    if (data.rawPortalData) {
      this.rawPortalData = data.rawPortalData;
    }
  }

  private updateFromPortalData(portalData: IPortalData) {
    // Raw Portal Data JWT includes expiration time (`exp`) and Issued at (`iat`)
    // exp: 1614635737
    // iat: 1614632137
    this.rawPortalData = portalData;
    this.name = portalData.fullName ?? DEFAULT_STUDENT_NAME;
    this.loggingUsername = portalData.loggingUsername ?? DEFAULT_STUDENT_LOGGING_USERNAME;
    this.teacherName = portalData?.classInfo?.teachers[0]?.fullName ?? DEFAULT_TEACHER_NAME;
    this.platformUserId = portalData.platformUserId;
    this._validTokens = true;
    this.saveSerializedLocalData();
  }

  private saveSerializedLocalData() {
    window.localStorage.setItem(STUDENT_LOCAL_STORAGE_KEY, this.serializeData());
  }

}


/**
 * To match LARA we would normally also include a tool_user_id, but the activity player
 * keeps no user ids of its own.
 */
// export interface ILTIPartial {
//   platform_id: string;      // portal
//   platform_user_id: string; // Portal user_id
//   context_id: string;       // class hash
//   resource_link_id: string; // offering ID
//   resource_url: string;     // Activity or sequence ID
//   run_key: string;          // Unique run identifier
//   source_key: string;
//   tool_id: string;
// }

// export interface IAnonymousMetadataPartial {
//   resource_url: string;
//   run_key: string;
//   source_key: string;
//   tool_id: string;
//   tool_user_id: "anonymous";
//   platform_user_id: string;
// }


// What data gets set in the Activity Player URL when launched from portal
// http://localhost:11000/activity=https%3A%2F%2Fauthoring.staging.concord.org%2Fapi%2Fv1%2Factivities%2F20926.json?token=123&domain=https://learn.staging.concord.org/&domain_uid=383

// if there is a token, get some JWTs
// Portal JWT
// FireStore JWT
// Inspect the JWT for class info

// You can pull this data out of the portal_api.ts file
// Launch URL instead of URL:
// http://localhost:11000/activity=https%3A%2F%2Fauthoring.staging.concord.org%2Fapi%2Fv1%2Factivities%2F20926.json?class_info_url=https%3A%2F%2Flearn.staging.concord.org%2Fapi%2Fv1%2Fclasses%2F1&context_id=b1c1cab9c696a5cdbeaf700d704ac9f848df87907d008534&domain=https%3A%2F%2Flearn.staging.concord.org%2F&domain_uid=383&externalId=2029&logging=true&platform_id=https%3A%2F%2Flearn.staging.concord.org&platform_user_id=383&resource_link_id=1610&returnUrl=https%3A%2F%2Flearn.staging.concord.org%2Fdataservice%2Fexternal_activity_data%2F4bd0b794-cb90-43fe-8598-2c85924efefc
/*

http://localhost:11000/index.html?class_info_url=https://learn.staging.concord.org/api/v1/classes/1&context_id=b1c1cab9c696a5cdbeaf700d704ac9f848df87907d008534&domain=https://learn.staging.concord.org/&domain_uid=383&externalId=2029&logging=true&platform_id=https://learn.staging.concord.org&platform_user_id=383&resource_link_id=1610&returnUrl=https://learn.staging.concord.org/dataservice/external_activity_data/4bd0b794-cb90-43fe-8598-2c85924efefc

*/

