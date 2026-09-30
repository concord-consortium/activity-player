import React from "react";
import { shallow } from "enzyme";
import { App } from "./app";
import { kSessionExpiredMessage } from "./error/error-messages";
import _activity from "../data/version-2/sample-new-sections-multiple-layout-types.json";

let mockBearerToken: string | null = null;
jest.mock("../utilities/auth-utils", () => ({
  ...jest.requireActual("../utilities/auth-utils"),
  getBearerToken: () => mockBearerToken
}));

const iat = Math.floor(Date.now() / 1000);
const mockPortalJWT = (userType: string) => ({ uid: 7, user_type: userType, learner_id: 5, offering_id: 3, class_info_url: "c", iat, exp: iat + 3600 });
const mockFetchPortalJWT = jest.fn();
const mockGetFirebaseJWT = jest.fn();
jest.mock("../portal-api", () => ({
  ...jest.requireActual("../portal-api"),
  fetchPortalJWT: (...args: any[]) => mockFetchPortalJWT(...args),
  fetchPortalData: () => Promise.resolve({
    type: "authenticated", userType: "learner", contextId: "class-hash", basePortalUrl: "https://portal/",
    offering: { id: 3, activityUrl: "https://authoring/activities/1", rubricUrl: "", locked: false },
    platformId: "https://portal", platformUserId: "7", resourceLinkId: "3",
    database: { appName: "report-service-dev", sourceKey: "source", rawFirebaseJWT: "launch-firebase-jwt" },
    runRemoteEndpoint: "https://portal/learners/5"
  }),
  getFirebaseJWT: (...args: any[]) => mockGetFirebaseJWT(...args)
}));

jest.mock("../firebase-db", () => ({
  ...jest.requireActual("../firebase-db"),
  initializeDB: jest.fn(() => Promise.resolve()),
  initializeAnonymousDB: jest.fn(() => Promise.resolve()),
  signInWithToken: jest.fn(() => Promise.resolve()),
  getApRun: jest.fn(() => Promise.resolve(null)),
  createOrUpdateApRun: jest.fn()
}));

jest.mock("../lara-api", () => ({
  ...jest.requireActual("../lara-api"),
  getActivityDefinition: jest.fn(() => Promise.resolve(_activity))
}));

jest.mock("../lib/logger", () => ({
  ...jest.requireActual("../lib/logger"),
  getLoggingTeacherUsername: () => "7@portal"
}));

let mockJobExecutorConfig: any = null;
jest.mock("../firebase-job-executor", () => ({
  ...jest.requireActual("../firebase-job-executor"),
  configure: (config: any) => { mockJobExecutorConfig = config; }
}));

const mockInitializePortalJWTManager = jest.fn();
jest.mock("../portal-jwt-manager", () => {
  const actual = jest.requireActual("../portal-jwt-manager");
  return {
    ...actual,
    initializePortalJWTManager: (options: any) => {
      mockInitializePortalJWTManager(options);
      return actual.initializePortalJWTManager(options);
    }
  };
});

const mockInitializeObjectStorageJWT = jest.fn();
jest.mock("../firebase-jwt-cache", () => {
  const actual = jest.requireActual("../firebase-jwt-cache");
  return {
    ...actual,
    initializeObjectStorageJWT: (options: any) => {
      mockInitializeObjectStorageJWT(options);
      return actual.initializeObjectStorageJWT(options);
    }
  };
});

const mountApp = async () => {
  const wrapper = shallow(<App />);
  for (let i = 0; i < 20; i++) await new Promise(r => setTimeout(r, 0));
  return wrapper;
};

describe("App portal token handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockJobExecutorConfig = null;
    mockGetFirebaseJWT.mockResolvedValue(["token-service-jwt"]);
  });
  afterEach(() => {
    jest.requireActual("../portal-jwt-manager").getPortalJWTManager()?.dispose();
  });

  it("creates the portal JWT manager and the object storage token for a learner launch", async () => {
    mockBearerToken = "launch-token";
    mockFetchPortalJWT.mockResolvedValue({ basePortalUrl: "https://portal/", rawPortalJWT: "portal-jwt", portalJWT: mockPortalJWT("learner") });
    const wrapper = await mountApp();
    expect(wrapper.state("errorType")).toBeNull();
    expect(mockInitializePortalJWTManager).toHaveBeenCalledWith(expect.objectContaining({ rawPortalJWT: "portal-jwt" }));
    expect(mockInitializeObjectStorageJWT).toHaveBeenCalledWith(expect.objectContaining({ rawFirebaseJWT: "launch-firebase-jwt" }));
  });

  it("creates neither for a teacher launch", async () => {
    mockBearerToken = "launch-token";
    mockFetchPortalJWT.mockResolvedValue({ basePortalUrl: "https://portal/", rawPortalJWT: "portal-jwt", portalJWT: mockPortalJWT("teacher") });
    const wrapper = await mountApp();
    expect(mockFetchPortalJWT).toHaveBeenCalled();
    expect(wrapper.state("errorType")).toBeNull();
    expect(mockInitializePortalJWTManager).not.toHaveBeenCalled();
    expect(mockInitializeObjectStorageJWT).not.toHaveBeenCalled();
  });

  it("creates neither for an anonymous run", async () => {
    mockBearerToken = null;
    await mountApp();
    expect(mockJobExecutorConfig).not.toBeNull();
    expect(mockInitializePortalJWTManager).not.toHaveBeenCalled();
    expect(mockInitializeObjectStorageJWT).not.toHaveBeenCalled();
  });

  it("reports an expired session to the caller without switching the app to an error screen", async () => {
    mockBearerToken = "launch-token";
    mockFetchPortalJWT.mockResolvedValue({ basePortalUrl: "https://portal/", rawPortalJWT: "portal-jwt", portalJWT: mockPortalJWT("learner") });
    const wrapper = await mountApp();
    expect(wrapper.state("errorType")).toBeNull();
    mockGetFirebaseJWT.mockRejectedValue("Signature has expired");
    await expect(mockJobExecutorConfig.getFirebaseJWT("report-service-dev")).rejects.toMatchObject({ message: kSessionExpiredMessage });
    for (let i = 0; i < 5; i++) await new Promise(r => setTimeout(r, 0));
    expect(wrapper.state("errorType")).toBeNull();
  });
});
