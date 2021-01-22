import { handleGetFirebaseJWT } from "./portal-utils";

const params = { firebase_app: "firebase-app" };
const rawFirebaseJWT = "rawFirebaseJWT";
const rejectMessage = "Bad PortalJWT!";

jest.mock("./portal-api", () => (
  {
    getFirebaseJWT: (basePortalUrl: string, rawPortalJWT: string) => {
      if (rawPortalJWT === "rawPortalJWT") {
        return Promise.resolve([rawFirebaseJWT]);
      }
      throw new Error(rejectMessage);
    }
  }
));

describe("handleGetFirebaseJWT", () => {

  const portalData: any = {
          learnerKey: "learnerKey",
          basePortalUrl: "basePortalUrl",
          rawPortalJWT: "rawPortalJWT"
        };

  it("resolves with good portal data", async () => {
    const response = await handleGetFirebaseJWT(params, portalData);
    expect(response).toBe(rawFirebaseJWT);
  });

  it("resolves without learnerKey in portal data", async () => {
    delete portalData.learnerKey;
    const response = await handleGetFirebaseJWT(params, portalData);
    expect(response).toBe(rawFirebaseJWT);
  });

  it("rejects with bad portal data", async () => {
    let err = "";
    try {
      portalData.rawPortalJWT = "badPortalJWT";
      await handleGetFirebaseJWT(params, portalData);
    }
    catch(e) {
      err = e.toString();
    }
    expect(err).toMatch(new RegExp(rejectMessage));
  });

  it("rejects with no portal data", async () => {
    let err = "";
    try {
      await handleGetFirebaseJWT(params);
    }
    catch(e) {
      err = e.toString();
    }
    expect(err).toMatch("Error");
  });
});
