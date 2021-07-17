import * as AWS from "aws-sdk";
import { v4 as uuid } from "uuid";
import { Credentials, S3Resource, TokenServiceClient } from "@concord-consortium/token-service";
import { firebaseAppName, getFirebaseJWT, getUniqueLearnerString } from "../portal-api";
import { IPortalData, IPortalDataUnion } from "../portal-types";
import { IAttachmentsFolder, IReadableAttachmentInfo, isWritableAttachmentsFolder, IWritableAttachmentsFolder } from "../types";

const kTokenServiceToolName = "interactive-attachments";
const kDefaultWriteExpirationSec = 5 * 60;
const kDefaultReadExpirationSec = 2 * 60 * 60;

let resolveAttachmentsManager: (manager: AttachmentsManager) => void;
export const attachmentsManager = new Promise<AttachmentsManager>((resolve, reject) => {
  resolveAttachmentsManager = resolve;
});

export const initializeAttachmentsManager = async (portalData: IPortalDataUnion) => {
  const learnerId = getUniqueLearnerString(portalData);
  const { basePortalUrl, rawPortalJWT } = portalData as IPortalData;
  let firebaseJwt: string | undefined;
  if (basePortalUrl && rawPortalJWT) {
    const queryParams = { firebase_app: "token-service" };
    [firebaseJwt] = await getFirebaseJWT(basePortalUrl, rawPortalJWT, queryParams);
  }
  resolveAttachmentsManager(new AttachmentsManager(learnerId, firebaseJwt));
};

export class AttachmentsManager {
  private sessionId = uuid();
  private learnerId?: string;
  private firebaseJwt?: string;
  private tokenServiceClient: TokenServiceClient;
  private resources: Record<string, S3Resource> = {};

  constructor(learnerId: string, firebaseJwt?: string) {
    this.learnerId = learnerId;
    this.firebaseJwt = firebaseJwt;

    const env = firebaseAppName() === "report-service-pro" ? "production" : "staging";
    this.tokenServiceClient = new TokenServiceClient({ env, jwt: firebaseJwt });
  }

  public isAnonymous() {
    // The client will be anonymous if firebaseJwt undefined
    return !this.firebaseJwt;
  }

  public getSessionId() {
    return this.sessionId;
  }

  public async createFolder(interactiveId: string): Promise<IWritableAttachmentsFolder> {
    const folderResource = await this.tokenServiceClient.createResource({
      tool: kTokenServiceToolName,
      type: "s3Folder",
      name: `${this.learnerId}-${interactiveId}`,
      description: "",
      accessRuleType: this.isAnonymous() ? "readWriteToken" : "user"
    });
    this.resources[folderResource.id] = folderResource as S3Resource;
    return {
      id: folderResource.id,
      readWriteToken: this.tokenServiceClient.getReadWriteToken(folderResource) || undefined
    };
  }

  public async getSignedWriteUrl(
    folder: IAttachmentsFolder, name: string, expires = kDefaultWriteExpirationSec
  ): Promise<[string, IReadableAttachmentInfo]> {
    const folderResource = await this.getFolderResource(folder);
    const publicPath = this.tokenServiceClient.getPublicS3Path(folderResource, `${this.sessionId}/${name}`);
    const url = await this.getSignedUrlFromPublicPath(folderResource, publicPath, "putObject", expires);
    return [url, { folder: { id: folder.id }, publicPath }];
  }

  public async getSignedReadUrl(attachmentInfo: IReadableAttachmentInfo, expires = kDefaultReadExpirationSec) {
    const { folder, publicPath } = attachmentInfo;
    const folderResource = await this.getFolderResource(folder);
    return this.getSignedUrlFromPublicPath(folderResource, publicPath, "getObject", expires);
  }

  private async getFolderResource(folder: IAttachmentsFolder): Promise<S3Resource> {
    let folderResource: S3Resource = this.resources[folder.id];
    if (!folderResource) {
      folderResource = await this.tokenServiceClient.getResource(folder.id) as S3Resource;
      this.resources[folderResource.id] = folderResource;
    }
    return folderResource;
  }

  private getCredentials(folder: IAttachmentsFolder): Promise<Credentials> {
    const readWriteToken = isWritableAttachmentsFolder(folder) ? folder.readWriteToken : undefined;
    return this.tokenServiceClient.getCredentials(folder.id, readWriteToken);
  }

  private async getSignedUrlFromPublicPath(folderResource: S3Resource, publicPath: string, operation: string, expires: number) {
    const credentials = await this.getCredentials(folderResource);
    const { bucket, region } = folderResource;
    const { accessKeyId, secretAccessKey, sessionToken } = credentials;
    const s3 = new AWS.S3({ region, accessKeyId, secretAccessKey, sessionToken });
    // https://zaccharles.medium.com/s3-uploads-proxies-vs-presigned-urls-vs-presigned-posts-9661e2b37932
    const s3UrlParams = { Bucket: bucket, Key: publicPath, Expires: expires };
    return s3.getSignedUrlPromise(operation, s3UrlParams);
  }
}
