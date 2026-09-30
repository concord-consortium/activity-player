import { kSessionExpiredMessage } from "./components/error/error-messages";
import { handleGetFirebaseJWT } from "./portal-utils";
import { initializePortalJWTManager, PortalJWTManager } from "./portal-jwt-manager";

const params = { firebase_app: "firebase-app" };
const rawFirebaseJWT = "rawFirebaseJWT";
const rejectMessage = "Bad PortalJWT!";

jest.mock("./portal-api", () => (
  {
    getFirebaseJWT: (basePortalUrl: string, rawPortalJWT: string) => {
      if (rawPortalJWT === "rawPortalJWT") {
        return Promise.resolve([rawFirebaseJWT]);
      }
      if (rawPortalJWT === "expiredPortalJWT") {
        return Promise.reject("Signature has expired");
      }
      throw new Error(rejectMessage);
    }
  }
));

describe("handleGetFirebaseJWT", () => {
  let manager: PortalJWTManager;
  const initManager = (rawPortalJWT: string) => {
    const iat = Math.floor(Date.now() / 1000);
    manager = initializePortalJWTManager({ rawPortalJWT, portalJWT: { iat, exp: iat + 3600 } as any, mint: jest.fn() });
  };
  afterEach(() => manager?.dispose());

  const portalData: any = {
          learnerKey: "learnerKey",
          basePortalUrl: "basePortalUrl"
        };

  it("resolves with the manager's current token", async () => {
    initManager("rawPortalJWT");
    const response = await handleGetFirebaseJWT(params, portalData);
    expect(response).toBe(rawFirebaseJWT);
  });

  it("resolves without learnerKey in portal data", async () => {
    initManager("rawPortalJWT");
    const { learnerKey, ...withoutLearnerKey } = portalData;
    const response = await handleGetFirebaseJWT(params, withoutLearnerKey);
    expect(response).toBe(rawFirebaseJWT);
  });

  it("rejects when the Firebase request fails", async () => {
    initManager("badPortalJWT");
    await expect(handleGetFirebaseJWT(params, portalData)).rejects.toThrow(rejectMessage);
  });

  it("rejects with the session-expired message when the portal refuses the token as expired", async () => {
    initManager("expiredPortalJWT");
    await expect(handleGetFirebaseJWT(params, portalData)).rejects.toMatchObject({ message: kSessionExpiredMessage });
  });

  it("rejects with no portal data", async () => {
    initManager("rawPortalJWT");
    await expect(handleGetFirebaseJWT(params)).rejects.toThrow("Error retrieving Firebase JWT!");
  });
});
