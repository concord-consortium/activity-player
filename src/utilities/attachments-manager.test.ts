import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Credentials, Resource, TokenServiceClient } from "@concord-consortium/token-service";
import { IAnonymousPortalData, IPortalData } from "../portal-types";
import { IReadableAttachmentInfo, IWritableAttachmentsFolder } from "../types";
import { AttachmentsManager, IS3SignedUrlOptions, ISignedWriteUrlOptions } from "./attachments-manager";
import {
  attachmentsManager, createAttachmentsManager, initializeAttachmentsManager
} from "./attachments-manager-global";

let mockCount = 0;
jest.mock("uuid", () => ({
  v4: () => `uuid-${++mockCount}`
}));

const mockSignedReadUrl = "https://concord.org/read/url";
const mockSignedWriteUrl = "https://concord.org/write/url";
const mockGetSignedUrl = jest.fn((client: any, command: any, options: any) => {
  return Promise.resolve(command instanceof PutObjectCommand ? mockSignedWriteUrl : mockSignedReadUrl);
});
const lastCall = (mockFn: jest.Mock) => mockFn.mock.calls[mockFn.mock.calls.length - 1];
const lastSignedUrlRequest = () => lastCall(mockGetSignedUrl);
const lastSignedUrlRequestIsGet = () => lastSignedUrlRequest()[1] instanceof GetObjectCommand;
const lastSignedUrlRequestIsPut = () => lastSignedUrlRequest()[1] instanceof PutObjectCommand;
jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (client: any, command: any, options: any) => mockGetSignedUrl(client, command, options)
}));

const mockBasePortalUrl = "https://learn.concord.org";
const mockRawPortalJWT = "rawPortalJWT";
const mockRawFirebaseJWT = "rawFirebaseJWT";
const mockFirebaseAppName = jest.fn(() => "report-service-dev");
const mockFirebaseJwtRejectMessage = "No JWT for you!";
jest.mock("../portal-api", () => (
  {
    ...jest.requireActual("../portal-api"),
    firebaseAppName: () => mockFirebaseAppName(),
    getFirebaseJWT: (basePortalUrl: string, rawPortalJWT: string) => {
      if (rawPortalJWT === mockRawPortalJWT) {
        return Promise.resolve([mockRawFirebaseJWT]);
      }
      throw new Error(mockFirebaseJwtRejectMessage);
    }
  }
));

const mockFolderId = "folder-id";
const mockResourceType = "s3Folder";
const mockResourceBucket = "bucket";
const mockResourcePublicPath = "public-path";
const mockResource: Resource = {
    id: mockFolderId,
    name: "folder-name",
    type: mockResourceType,
    description: "description",
    tool: "attachments",
    bucket: mockResourceBucket,
    folder: "folder",
    region: "region",
    publicPath: mockResourcePublicPath,
    publicUrl: "public-url"
};
const mockGetResource = jest.fn((resourceId: string) => {
  const resource = { ...mockResource, id: resourceId };
  return Promise.resolve<Resource>(resource);
});
const mockCreateResource = jest.fn((interactiveId: string) => {
  return Promise.resolve<Resource>(mockResource);
});
const mockAccessKeyId = "access-key-id";
const mockExpiration = new Date();
const mockSecretAccessKey = "secret-access-key";
const mockSessionToken = "session-token";
const mockCredentials: Credentials = {
  accessKeyId: mockAccessKeyId,
  expiration: mockExpiration,
  secretAccessKey: mockSecretAccessKey,
  sessionToken: mockSessionToken
};
const mockGetCredentials = jest.fn(() => mockCredentials);
const mockReadWriteToken = "read-write-token";
const mockGetReadWriteToken = jest.fn(() => mockReadWriteToken);
const mockGetPublicS3Path = jest.fn(() => mockResourcePublicPath);
jest.mock("@concord-consortium/token-service", () => ({
  TokenServiceClient: jest.fn(() => ({
    getResource: mockGetResource,
    createResource: mockCreateResource,
    getCredentials: mockGetCredentials,
    getReadWriteToken: mockGetReadWriteToken,
    getPublicS3Path: mockGetPublicS3Path
  }))
}));

describe("AttachmentsManager", () => {

  beforeEach(() => {
    mockCount = 0;
  });

  describe("when anonymous", () => {
    const mockRunKey = "anonymous-run-key";
    const kAnonymousPortalData: IAnonymousPortalData = {
      type: "anonymous",
      userType: "learner",
      runKey: mockRunKey,
      resourceUrl: "https://concord.org/my/resource",
      toolId: "my-tool",
      toolUserId: "anonymous",
      database: {
        appName: "report-service-dev",
        sourceKey: "database-source-key"
      }
    };

    let mgr: AttachmentsManager;

    beforeEach(async () => {
      mgr = await createAttachmentsManager(kAnonymousPortalData);
    });

    it("should initialize", async () => {
      expect(mgr.getSessionId()).toBe("uuid-1");
      expect((mgr as any).learnerId).toBe(mockRunKey);
      expect((mgr as any).firebaseJwt).toBeUndefined();
      expect(mgr.isAnonymous()).toBe(true);
      // mock constructor should have been called
      expect(TokenServiceClient).toHaveBeenCalled();
      expect((mgr as any).tokenServiceClient).toBeDefined();
    });

    it("should create folder", async () => {
      const folder = await mgr.createFolder("interactive-id");
      expect(folder.id).toBe(mockFolderId);
      expect(folder.readWriteToken).toBe(mockReadWriteToken);
      const folderResource = await (mgr as any).getFolderResource({ id: mockFolderId });
      expect(folderResource).toEqual(mockResource);
    });

    it("should retrieve folder", async () => {
      const folderResource = await (mgr as any).getFolderResource({ id: mockFolderId });
      expect(folderResource).toEqual(mockResource);
    });

    it("can get credentials", async () => {
      const credentials: Credentials = await (mgr as any).getCredentials({ id: mockFolderId });
      expect(credentials.accessKeyId).toBe(mockAccessKeyId);
      expect(credentials.secretAccessKey).toBe(mockSecretAccessKey);
    });

    it("can get signed read url", async () => {
      const readInfo: IReadableAttachmentInfo = {
        folder: { id: mockFolderId },
        publicPath: mockResourcePublicPath
      };
      const url = await mgr.getSignedReadUrl(readInfo);
      expect(lastSignedUrlRequestIsGet()).toBe(true);
      expect(url).toBe(mockSignedReadUrl);
    });

    it("can get signed write url with default options", async () => {
      const writeInfo: IWritableAttachmentsFolder = {
        id: mockFolderId, readWriteToken: mockReadWriteToken
      };
      const url = await mgr.getSignedWriteUrl(writeInfo, "foo");
      const readInfo: IReadableAttachmentInfo = {
        folder: { id: mockFolderId },
        publicPath: mockResourcePublicPath
      };
      expect(lastSignedUrlRequestIsPut()).toBe(true);
      expect(url).toEqual([mockSignedWriteUrl, readInfo]);
    });

    it("can get signed write url with explicit options", async () => {
      const writeInfo: IWritableAttachmentsFolder = {
        id: mockFolderId, readWriteToken: mockReadWriteToken
      };
      const options: ISignedWriteUrlOptions = {
        ContentType: "image/png",
        expiresIn: 60 * 60
      };
      const url = await mgr.getSignedWriteUrl(writeInfo, "foo", options);
      const readInfo: IReadableAttachmentInfo = {
        folder: { id: mockFolderId },
        publicPath: mockResourcePublicPath
      };
      expect(lastSignedUrlRequestIsPut()).toBe(true);
      expect(lastSignedUrlRequest()[1].input.ContentType).toBe("image/png");
      expect(url).toEqual([mockSignedWriteUrl, readInfo]);
    });

    it("type of signed write url defaults to text/plain", async () => {
      const writeInfo: IWritableAttachmentsFolder = {
        id: mockFolderId, readWriteToken: mockReadWriteToken
      };
      const options: IS3SignedUrlOptions = { Key: "foo" };
      const url = await (mgr as any).getSignedUrl(writeInfo, "putObject", options);
      expect(lastSignedUrlRequestIsPut()).toBe(true);
      expect(lastSignedUrlRequest()[1].input.ContentType).toBe("text/plain");
      expect(url).toEqual(mockSignedWriteUrl);
    });
  });

  describe("when authenticated", () => {
    const mockRunRemoteEndpoint = "run-remote-endpoint";
    const kAuthenticatedPortalData: IPortalData = {
      platformId: "https://learn.concord.org",
      platformUserId: "platform-user-id",
      contextId: "context-id",
      resourceLinkId: "resource-link-id",
      type: "authenticated",
      offering: { id: 1, activityUrl: "https://concord.org/activity", rubricUrl: "" },
      userType: "learner",
      resourceUrl: "https://concord.org/my/resource",
      toolId: "my-tool",
      database: {
        appName: "report-service-dev",
        sourceKey: "database-source-key",
        rawFirebaseJWT: mockRawFirebaseJWT
      },
      basePortalUrl: mockBasePortalUrl,
      rawPortalJWT: mockRawPortalJWT,
      runRemoteEndpoint: mockRunRemoteEndpoint
    };

    let mgr: AttachmentsManager;

    beforeEach(async () => {
      mgr = await createAttachmentsManager(kAuthenticatedPortalData);
      mockFirebaseAppName.mockImplementation(() => "report-service-pro");
    });

    it("should initialize the global promise", async () => {
      await initializeAttachmentsManager(kAuthenticatedPortalData);
      mgr = await attachmentsManager;
      expect(mgr.getSessionId()).toBe("uuid-2");
      expect((mgr as any).learnerId).toBe(mockRunRemoteEndpoint);
      expect((mgr as any).firebaseJwt).toBe(mockRawFirebaseJWT);
      expect(mgr.isAnonymous()).toBe(false);
      // mock constructor should have been called
      expect(TokenServiceClient).toHaveBeenCalled();
      expect((mgr as any).tokenServiceClient).toBeDefined();
    });

    it("should initialize", async () => {
      expect(mgr.getSessionId()).toBe("uuid-1");
      expect((mgr as any).learnerId).toBe(mockRunRemoteEndpoint);
      expect((mgr as any).firebaseJwt).toBe(mockRawFirebaseJWT);
      expect(mgr.isAnonymous()).toBe(false);
      // mock constructor should have been called
      expect(TokenServiceClient).toHaveBeenCalled();
      expect((mgr as any).tokenServiceClient).toBeDefined();
    });

    it("should create folder", async () => {
      // authenticated users don't require readWriteToken
      mockGetReadWriteToken.mockImplementation(() => "");
      const folder = await mgr.createFolder("interactive-id");
      expect(folder.id).toBe(mockFolderId);
      expect(folder.readWriteToken).toBeUndefined();
      const folderResource = await (mgr as any).getFolderResource({ id: mockFolderId });
      expect(folderResource).toEqual(mockResource);
    });

    it("should retrieve folder", async () => {
      const folderResource = await (mgr as any).getFolderResource({ id: mockFolderId });
      expect(folderResource).toEqual(mockResource);
    });

    it("can get credentials", async () => {
      const credentials: Credentials = await (mgr as any).getCredentials({ id: mockFolderId });
      expect(credentials.accessKeyId).toBe(mockAccessKeyId);
      expect(credentials.secretAccessKey).toBe(mockSecretAccessKey);
    });

    it("can get signed read url", async () => {
      const readInfo: IReadableAttachmentInfo = {
        folder: { id: mockFolderId },
        publicPath: mockResourcePublicPath
      };
      const url = await mgr.getSignedReadUrl(readInfo, { expiresIn: 60 * 60 });
      expect(lastSignedUrlRequestIsGet()).toBe(true);
      expect(url).toBe(mockSignedReadUrl);
    });

    it("can get signed write url", async () => {
      const url = await mgr.getSignedWriteUrl({ id: mockFolderId }, "foo", { expiresIn: 60 * 60 });
      const readInfo: IReadableAttachmentInfo = {
        folder: { id: mockFolderId },
        publicPath: mockResourcePublicPath
      };
      expect(lastSignedUrlRequestIsPut()).toBe(true);
      expect(url).toEqual([mockSignedWriteUrl, readInfo]);
    });
  });
});
