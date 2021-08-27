import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuid } from "uuid";
import { Credentials, S3Resource, TokenServiceClient, EnvironmentName } from "@concord-consortium/token-service";
import { IAttachmentUrlRequest, IAttachmentUrlResponse } from "@concord-consortium/lara-interactive-api";

type S3Operation = "getObject" | "putObject";

export interface IAttachmentsFolder {
  id: string;
}

export interface IWritableAttachmentsFolder extends IAttachmentsFolder {
  readWriteToken?: string;
}

export interface IReadableAttachmentInfo {
  folder: IAttachmentsFolder;
  publicPath: string;
}

export interface IAttachmentsManagerInitOptions {
  tokenServiceEnv: EnvironmentName;
  tokenServiceFirestoreJWT?: string;
  // These options are necessary only when attachments manager is expected to support write operation.
  writeOptions?: {
    runKey?: string; // for anonymous users
    runRemoteEndpoint?: string; // for logged in users
  };
}

export interface ISignedReadUrlOptions {
  expiresIn?: number; // seconds
}

export interface ISignedWriteUrlOptions extends ISignedReadUrlOptions {
  ContentType?: string;
}

export interface IS3SignedUrlOptions extends ISignedWriteUrlOptions {
  Key: string;
}

const kTokenServiceToolName = "interactive-attachments";
const kDefaultWriteExpirationSec = 5 * 60;
const kDefaultReadExpirationSec = 2 * 60 * 60;

export const isWritableAttachmentsFolder = (folder: IAttachmentsFolder): folder is IWritableAttachmentsFolder =>
              !!(folder as IWritableAttachmentsFolder).readWriteToken;

export class AttachmentsManager {
  private sessionId = uuid();
  private learnerId?: string;
  private firebaseJwt?: string;
  private tokenServiceClient: TokenServiceClient;
  private resources: Record<string, S3Resource> = {};

  constructor(options: IAttachmentsManagerInitOptions) {
    this.learnerId = options.writeOptions?.runKey || options.writeOptions?.runRemoteEndpoint;
    if (options.writeOptions && !this.learnerId) {
      throw new Error("Attachments Manager requires runKey or runRemoteEndpoint to support write operation");
    }
    this.firebaseJwt = options.tokenServiceFirestoreJWT;
    this.tokenServiceClient = new TokenServiceClient({ env: options.tokenServiceEnv, jwt: this.firebaseJwt });
  }

  public isAnonymous() {
    // The client will be anonymous if firebaseJwt undefined
    return !this.firebaseJwt;
  }

  public isWriteSupported() {
    return !!this.learnerId;
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
      accessRuleType: this.isAnonymous() ? "readWriteToken" : ["user", "context"]
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
    const { ContentType = "text/plain", expiresIn = kDefaultWriteExpirationSec } = options || {};
    // TODO: validate the type; cf. https://advancedweb.hu/how-to-use-s3-put-signed-urls/
    const folderResource = await this.getFolderResource(folder);
    const publicPath = this.tokenServiceClient.getPublicS3Path(folderResource, `${this.sessionId}/${name}`);
    const url = await this.getSignedUrl(folder, "putObject", { Key: publicPath, ContentType, expiresIn });
    // returns the writable url and the information required to read it
    return [url, { folder: { id: folder.id }, publicPath }];
  }

  public getSignedReadUrl(attachmentInfo: IReadableAttachmentInfo, options?: ISignedReadUrlOptions) {
    const { folder, publicPath } = attachmentInfo;
    const { expiresIn = kDefaultReadExpirationSec } = options || {};
    return this.getSignedUrl(folder, "getObject", { Key: publicPath, expiresIn });
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
    const { Key, ContentType = "text/plain", expiresIn } = options;
    const folderResource = await this.getFolderResource(folder);
    const credentials = await this.getCredentials(folder);
    const { bucket: Bucket, region } = folderResource;
    const { accessKeyId, secretAccessKey, sessionToken } = credentials;
    const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey, sessionToken } });
    // https://aws.amazon.com/blogs/developer/generate-presigned-url-modular-aws-sdk-javascript/
    const command = operation === "putObject"
                      ? new PutObjectCommand({ Bucket, Key, ContentType })
                      : new GetObjectCommand({ Bucket, Key });
    return getSignedUrl(s3, command, { expiresIn } );
  }
}

let resolveAttachmentsManager: (manager: AttachmentsManager) => void;
export const attachmentsManager = new Promise<AttachmentsManager>((resolve, reject) => {
  resolveAttachmentsManager = resolve;
});

export const initializeAttachmentsManager = async (optionsPromise: Promise<IAttachmentsManagerInitOptions>) => {
  resolveAttachmentsManager(new AttachmentsManager(await optionsPromise));
};

export interface IAnswerMetadataWithAttachmentsInfo {
  attachmentsFolder?: IAttachmentsFolder;
  // tracks the most recently written details for each attachment
  attachments?: Record<string, IReadableAttachmentInfo>;
}

export interface IHandleGetAttachmentUrlOptions {
  request: IAttachmentUrlRequest;
  answerMeta: IAnswerMetadataWithAttachmentsInfo;
  writeOptions?: {
    // This is necessary only for write operation.
    interactiveId: string;
    onAnswerMetaUpdate: (newAnswerMeta: IAnswerMetadataWithAttachmentsInfo) => void;
  }
}

export const handleGetAttachmentUrl = async (options: IHandleGetAttachmentUrlOptions): Promise<IAttachmentUrlResponse> => {
  const { name, operation, contentType, expiresIn, requestId } = options.request;
  const response: IAttachmentUrlResponse = { requestId };
  const attachmentsMgr = await attachmentsManager;
  if (!attachmentsMgr) {
    response.error = "error getting attachment url: the host environment did not initialize the attachments manager";
    return response;
  }

  const answerMeta = options.answerMeta;
  let { attachmentsFolder, attachments } = answerMeta;
  try {
    if (operation === "write") {
      if (!attachmentsMgr.isWriteSupported() || !options.writeOptions) {
        response.error = "error getting attachment url: the write operation is not supported by the host environment";
        return response;
      }
      if (!attachmentsFolder) {
        attachmentsFolder = answerMeta.attachmentsFolder = await attachmentsMgr.createFolder(options.writeOptions?.interactiveId);
      }
      if (!attachments) {
        attachments = answerMeta.attachments = {};
      }
      const urlOptions: ISignedWriteUrlOptions = { ContentType: contentType, expiresIn };
      const [writeUrl, attachmentInfo] = await attachmentsMgr.getSignedWriteUrl(attachmentsFolder, name, urlOptions);
      response.url = writeUrl;
      // public path changes with sessionId
      if (!attachments[name] || (attachmentInfo.publicPath !== attachments[name].publicPath)) {
        attachments[name] = attachmentInfo;
        options.writeOptions.onAnswerMetaUpdate(answerMeta);
      }
    }
    else if (operation === "read") {
      if (attachmentsFolder && attachments && attachments[name]) {
        // TODO: this won't work for run-with-others where we won't have a readWriteToken
        const attachmentInfo = { ...attachments[name], folder: attachmentsFolder };
        response.url = await attachmentsMgr.getSignedReadUrl(attachmentInfo, { expiresIn });
      } else {
        response.error = `error getting attachment url: ${name} ["No attachment info in answer metadata"]`;
        return response;
      }
    }
  }
  catch (e) {
    response.error = `error creating url for attachment: "${name}" [s3: "${e}"]`;
  }
  return response;
};
