import { RawClassInfo } from "../portal-api";
import { IAnonymousPortalData, IPortalData } from "../portal-types";
import { getAttachmentsManagerOptions } from "./get-attachments-manager-options";

const mockBasePortalUrl = "https://learn.concord.org";
const mockRawPortalJWT = "rawPortalJWT";
const mockRawFirebaseJWT = "rawFirebaseJWT";
const mockFirebaseAppName = jest.fn(() => "report-service-dev");
const mockFirebaseJwtRejectMessage = "No JWT for you!";
jest.mock("../portal-api", () => ({
  ...jest.requireActual("../portal-api"),
  firebaseAppName: () => mockFirebaseAppName(),
  getFirebaseJWT: (basePortalUrl: string, rawPortalJWT: string) => {
    if (rawPortalJWT === mockRawPortalJWT) {
      return Promise.resolve([mockRawFirebaseJWT]);
    }
    throw new Error(mockFirebaseJwtRejectMessage);
  }
}));

describe("getAttachmentsManagerOptions", () => {
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

    it("returns correct options based on Portal data", async () => {
      expect(await getAttachmentsManagerOptions(kAnonymousPortalData)).toEqual({
        tokenServiceFirestoreJWT: undefined,
        tokenServiceEnv: "staging",
        writeOptions: {
          runKey: mockRunKey,
          runRemoteEndpoint: undefined
        }
      });
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
      offering: { id: 1, activityUrl: "https://concord.org/activity", rubricUrl: "", locked: false },
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
      runRemoteEndpoint: mockRunRemoteEndpoint,
      rawClassInfo: {} as RawClassInfo,
      collaboratorsDataUrl: "https://example.com/collaborations/1234",
    };

    it("returns correct options based on Portal data", async () => {
      expect(await getAttachmentsManagerOptions(kAuthenticatedPortalData)).toEqual({
        tokenServiceFirestoreJWT: mockRawFirebaseJWT,
        tokenServiceEnv: "staging",
        writeOptions: {
          runKey: undefined,
          runRemoteEndpoint: mockRunRemoteEndpoint
        }
      });
    });
  });
});
