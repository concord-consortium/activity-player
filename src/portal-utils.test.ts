import { handleGetFirebaseJWTRequest } from "./portal-utils";

const requestId = "123456";
const rawFirebaseJWT = "rawFirebaseJWT";
const rejectMessage = "Bad PortalJWT!";
const resolvedFirebaseJWTResponse = { requestId, token: rawFirebaseJWT };
const rejectedFirebaseJWTResponse = { requestId, response_type: "ERROR", message: rejectMessage };

jest.mock("./portal-api", () => (
  {
    getFirebaseJWT: (basePortalUrl: string, rawPortalJWT: string) => {
      return rawPortalJWT === "rawPortalJWT"
              ? Promise.resolve([rawFirebaseJWT])
              : Promise.reject(rejectMessage);
    }
  }
));

describe("handleGetFirebaseJWT", () => {

  const phone: any = { post: jest.fn() };
  const request: any = { requestId };
  const portalData: any = {
          learnerKey: "learnerKey",
          basePortalUrl: "basePortalUrl",
          rawPortalJWT: "rawPortalJWT"
        };

  beforeEach(() => {
    phone.post.mockReset();
  });

  it("resolves with good portal data", async () => {
    await handleGetFirebaseJWTRequest({ phone, request, portalData });
    expect(phone.post.mock.calls.length).toBe(1);
    expect(phone.post.mock.calls[0][0]).toBe("firebaseJWT");
    expect(phone.post.mock.calls[0][1]).toEqual(resolvedFirebaseJWTResponse);
  });

  it("rejects with bad portal data", async () => {
    portalData.rawPortalJWT = "badPortalJWT";
    try {
      await handleGetFirebaseJWTRequest({ phone, request, portalData });
    }
    catch(e) {
      // ignore errors
    }
    expect(phone.post.mock.calls.length).toBe(1);
    expect(phone.post.mock.calls[0][0]).toBe("firebaseJWT");
    expect(phone.post.mock.calls[0][1]).toEqual(rejectedFirebaseJWTResponse);
  });
});
