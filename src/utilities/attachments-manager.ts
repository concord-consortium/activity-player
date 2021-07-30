import * as AWS from "aws-sdk";
import { v4 as uuid } from "uuid";
import { Credentials, S3Resource, TokenServiceClient } from "@concord-consortium/token-service";
import { firebaseAppName } from "../portal-api";
import { IAttachmentsFolder, IReadableAttachmentInfo, isWritableAttachmentsFolder, IWritableAttachmentsFolder } from "../types";

const kTokenServiceToolName = "interactive-attachments";
const kDefaultWriteExpirationSec = 5 * 60;
const kDefaultReadExpirationSec = 2 * 60 * 60;


type S3Operation = "getObject" | "putObject";

export interface ISignedReadUrlOptions {
  Expires?: number;
}

export interface ISignedWriteUrlOptions extends ISignedReadUrlOptions {
  ContentType?: string;
}

export interface IS3SignedUrlOptions extends ISignedWriteUrlOptions {
  Key: string;
}

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
      description: "attachment",
      accessRuleType: this.isAnonymous() ? "readWriteToken" : "user"
    });
    this.resources[folderResource.id] = folderResource as S3Resource;
    return {
      id: folderResource.id,
      readWriteToken: this.tokenServiceClient.getReadWriteToken(folderResource) || undefined
    };
  }

  public async getSignedWriteUrl(
    folder: IAttachmentsFolder, name: string, options?: ISignedWriteUrlOptions
  ): Promise<[string, IReadableAttachmentInfo]> {
    const { ContentType = "text/plain", Expires = kDefaultWriteExpirationSec } = options || {};
    // TODO: validate the type; cf. https://advancedweb.hu/how-to-use-s3-put-signed-urls/
    const folderResource = await this.getFolderResource(folder);
    const publicPath = this.tokenServiceClient.getPublicS3Path(folderResource, `${this.sessionId}/${name}`);
    const url = await this.getSignedUrl(folder, "putObject", { Key: publicPath, ContentType, Expires });
    // returns the writable url and the information required to read it
    return [url, { folder: { id: folder.id }, publicPath }];
  }

  public getSignedReadUrl(attachmentInfo: IReadableAttachmentInfo, options?: ISignedReadUrlOptions) {
    const { folder, publicPath } = attachmentInfo;
    const { Expires = kDefaultReadExpirationSec } = options || {};
    return this.getSignedUrl(folder, "getObject", { Key: publicPath, Expires });
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

  private async getSignedUrl(folder: IAttachmentsFolder, operation: S3Operation, options: IS3SignedUrlOptions) {
    const folderResource = await this.getFolderResource(folder);
    const credentials = await this.getCredentials(folder);
    const { bucket, region } = folderResource;
    const { accessKeyId, secretAccessKey, sessionToken } = credentials;
    const s3 = new AWS.S3({ region, accessKeyId, secretAccessKey, sessionToken });
    // https://zaccharles.medium.com/s3-uploads-proxies-vs-presigned-urls-vs-presigned-posts-9661e2b37932
    const s3UrlParams = { ...options, Bucket: bucket };
    // https://advancedweb.hu/differences-between-put-and-post-s3-signed-urls/
    if ((operation === "putObject") && !s3UrlParams.ContentType) {
      s3UrlParams.ContentType = "text/plain";
    }
    return s3.getSignedUrlPromise(operation, s3UrlParams);
  }
}
