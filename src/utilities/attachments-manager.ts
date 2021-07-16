import * as AWS from "aws-sdk";
import { Credentials, S3Resource, TokenServiceClient } from "@concord-consortium/token-service";
import { firebaseAppName } from "../portal-api";
import { IAttachmentsFolder } from "../types";

const kTokenServiceToolName = "interactive-attachments";
const kDefaultWriteExpirationSec = 5 * 60;
const kDefaultReadExpirationSec = 2 * 60 * 60;

let resolveAttachmentsManager: (manager: AttachmentsManager) => void;
export const attachmentsManager = new Promise<AttachmentsManager>((resolve, reject) => {
  resolveAttachmentsManager = resolve;
});

export const initializeAttachmentsManager = (learnerId: string, firebaseJwt?: string) => {
  resolveAttachmentsManager(new AttachmentsManager(learnerId, firebaseJwt));
};

export class AttachmentsManager {
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

  public async createFolder(interactiveId: string): Promise<IAttachmentsFolder> {
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

  public getAttachmentReadUrl(folder: IAttachmentsFolder, name: string) {
    return this.getSignedUrl(folder, name, "getObject", kDefaultReadExpirationSec);
  }

  public async getAttachmentWriteUrl(folder: IAttachmentsFolder, name: string) {
    return this.getSignedUrl(folder, name, "putObject", kDefaultWriteExpirationSec);
  }

  public async getAttachmentUrl(folder: IAttachmentsFolder, name: string, operation: "read" | "write") {
    const _operation = operation === "write" ? "putObject" : "getObject";
    const expires = operation === "read" ? kDefaultReadExpirationSec : kDefaultWriteExpirationSec;
    return this.getSignedUrl(folder, name, _operation, expires);
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
    return this.tokenServiceClient.getCredentials(folder.id, folder.readWriteToken);
  }

  private async getSignedUrl(folder: IAttachmentsFolder, name: string, operation: string, expires: number) {
    const folderResource = await this.getFolderResource(folder);
    const credentials = await this.getCredentials(folderResource);
    const { bucket, region } = folderResource;
    const { accessKeyId, secretAccessKey, sessionToken } = credentials;
    const s3 = new AWS.S3({ region, accessKeyId, secretAccessKey, sessionToken });
    const publicPath = this.tokenServiceClient.getPublicS3Path(folderResource, name);
    // https://zaccharles.medium.com/s3-uploads-proxies-vs-presigned-urls-vs-presigned-posts-9661e2b37932
    const s3UrlParams = { Bucket: bucket, Key: publicPath, Expires: expires };
    return s3.getSignedUrlPromise(operation, s3UrlParams);
  }
}
