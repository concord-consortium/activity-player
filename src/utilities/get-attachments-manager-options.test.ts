import { RawClassInfo } from "../portal-api";
import { IAnonymousPortalData, IPortalData } from "../portal-types";
import { initializePortalJWTManager, PortalJWTManager } from "../portal-jwt-manager";
import { getAttachmentsManagerOptions } from "./get-attachments-manager-options";

const mockBasePortalUrl = "https://learn.concord.org";
const mockRawFirebaseJWT = "rawFirebaseJWT";
const mockFirebaseAppName = jest.fn(() => "report-service-dev");
const mockRefreshTokenServiceJWT = jest.fn((basePortalUrl: string, rawPortalJWT: string) =>
  Promise.resolve([`token-service-jwt-for-${rawPortalJWT}`, {}]));
jest.mock("../portal-api", () => ({
  ...jest.requireActual("../portal-api"),
  firebaseAppName: () => mockFirebaseAppName(),
  refreshTokenServiceJWT: (basePortalUrl: string, rawPortalJWT: string) =>
    mockRefreshTokenServiceJWT(basePortalUrl, rawPortalJWT)
}));

beforeEach(() => mockRefreshTokenServiceJWT.mockClear());

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

    it("passes no token or token source", () => {
      expect(getAttachmentsManagerOptions(kAnonymousPortalData)).toStrictEqual({
        getTokenServiceFirestoreJWT: undefined,
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
      runRemoteEndpoint: mockRunRemoteEndpoint,
      rawClassInfo: {} as RawClassInfo,
      collaboratorsDataUrl: "https://example.com/collaborations/1234",
    };

    const iat = 1000;
    let now: number;
    let mint: jest.Mock;
    let manager: PortalJWTManager;
    beforeEach(() => {
      now = 1_000_000;
      mint = jest.fn(() => Promise.resolve(["refreshedPortalJWT", { iat, exp: iat + 3600 }]));
      manager = initializePortalJWTManager({
        rawPortalJWT: "launchPortalJWT", portalJWT: { iat, exp: iat + 3600 } as any, mint, now: () => now
      });
    });
    afterEach(() => manager.dispose());

    const getSource = () => {
      const source = getAttachmentsManagerOptions(kAuthenticatedPortalData).getTokenServiceFirestoreJWT;
      if (!source) throw new Error("no token source");
      return source;
    };

    it("passes a token source and no token, without minting", () => {
      expect(getAttachmentsManagerOptions(kAuthenticatedPortalData)).toStrictEqual({
        getTokenServiceFirestoreJWT: expect.any(Function),
        tokenServiceEnv: "staging",
        writeOptions: {
          runKey: undefined,
          runRemoteEndpoint: mockRunRemoteEndpoint
        }
      });
      expect(mockRefreshTokenServiceJWT).not.toHaveBeenCalled();
    });

    it("mints a new token-service JWT with the current portal JWT on every call", async () => {
      const source = getSource();
      await expect(source()).resolves.toBe("token-service-jwt-for-launchPortalJWT");
      now += 49 * 60 * 1000;
      await expect(source()).resolves.toBe("token-service-jwt-for-refreshedPortalJWT");
      expect(mockRefreshTokenServiceJWT.mock.calls).toEqual([
        [mockBasePortalUrl, "launchPortalJWT"],
        [mockBasePortalUrl, "refreshedPortalJWT"]
      ]);
      expect(mint).toHaveBeenCalledTimes(1);
    });

    it("rejects when the mint fails", async () => {
      mockRefreshTokenServiceJWT.mockImplementationOnce(() => Promise.reject("Portal error"));
      await expect(getSource()()).rejects.toBe("Portal error");
    });
  });
});
