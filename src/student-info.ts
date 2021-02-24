import { fetchPortalData, IPortalData } from "./portal-api";
import { Storage } from "./storage-facade";

const DEFAULT_STUDENT_NAME = "A student";
const DEFAULT_TEACHER_NAME = "A teacher";
const STUDENT_LOCAL_STORAGE_KEY = "ActivityPlayerStudent";

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
  roll: "student"
  teacherName: string,
  platformUserId: string,
  runs: Array<Run>,
  platformId?: string
  rawPortalData?: IPortalData
}

export class StudentInfo implements IStudentRecord {
  name: string;
  teacherName: string;
  platformUserId: string;
  roll: "student";
  runs: Run[];
  rawPortalData: IPortalData;
  dataReady: boolean;
  private _validTokens: boolean;

  
  constructor() {
    this._validTokens = false;
  }

  public init(): Promise<void> {
    return fetchPortalData({includeClassData: true})
      .then( (portalData: IPortalData) => this.updateFromPortalData(portalData))
      .catch( () => this.updateFromIndexDB());
  }

  public isAuthenticated() : boolean{
    return this._validTokens === true;
  }

  // TODO: Anonymous users can also send data ...
  public canSendData() : boolean {
    return this.isAuthenticated();
  }

  public hasValidTeacherName() : boolean{
    return this.teacherName !== DEFAULT_TEACHER_NAME;
  }

  public hasValidStudentName() {
    return this.name !== DEFAULT_STUDENT_NAME;
  }

  public getClassHash() {
    return this.rawPortalData?.contextId;
  }

  public getRunRemoteEndpoint() {
    return this.rawPortalData.runRemoteEndpoint;
  }

  private updateFromIndexDB() {
    // We have to load any data we can from the DB, but tokens will be stale.
    // removethem
    console.log("LOADING FROM LOCAL STORAGE");
    const local = localStorage.getItem(STUDENT_LOCAL_STORAGE_KEY) ?? "{}";
    this.loadSerializedData(local);
    this._validTokens=false;
  }

  private serializeData() {
    const data: IStudentRecord =  {
      name: this.name,
      roll: this.roll,
      teacherName: this.teacherName,
      platformUserId: this.platformUserId,
      runs: this.runs,
      rawPortalData: this.rawPortalData
    };
    return JSON.stringify(data);
  }

  private loadSerializedData(json: string) {
    console.log(json);
    const data: IStudentRecord = JSON.parse(json) as IStudentRecord;
    this.loadData(data);
  }

  private loadData(data: IStudentRecord ) {
    this.name = data.name ?? DEFAULT_STUDENT_NAME;
    this.teacherName = data.name ?? DEFAULT_TEACHER_NAME;
    this.platformUserId = data.platformUserId;
    this.runs = data.runs;
    this.roll = data.roll;
    if (data.rawPortalData) {
      this.rawPortalData = data.rawPortalData;
    }
    this.finish();
  }

  private updateFromPortalData(portalData: IPortalData) {
    this.rawPortalData = portalData;
    this.name = portalData.fullName ?? DEFAULT_STUDENT_NAME;
    this.teacherName = portalData?.classInfo?.teachers[0]?.fullName ?? DEFAULT_TEACHER_NAME;
    this._validTokens = true;
    window.localStorage.setItem(STUDENT_LOCAL_STORAGE_KEY, this.serializeData());
    this.finish();
  }

  private finish() {
    Storage.setPortalData(this.rawPortalData);
    this.dataReady = true;
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
// http://localhost:11000/activity=https%3A%2F%2Fauthoring.staging.concord.org%2Fapi%2Fv1%2Factivities%2F20926.json?token=4288827c6ce60dcba2186de82a50aa00&domain=https://learn.staging.concord.org/&domain_uid=383

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

