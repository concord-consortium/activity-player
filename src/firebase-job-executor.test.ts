import { firebaseJobExecutor, configure } from "./firebase-job-executor";
import { IJobInfo } from "@concord-consortium/interactive-api-host";

const mockUnsubscribe = jest.fn();
const mockOnSnapshot = jest.fn((successCb, _errorCb) => {
  (mockOnSnapshot as any)._successCb = successCb;
  (mockOnSnapshot as any)._errorCb = _errorCb;
  return mockUnsubscribe;
});
const mockDocRef = { onSnapshot: mockOnSnapshot };
const mockQueryGet = jest.fn();
const mockWhere = jest.fn().mockReturnThis();
const mockCollection = jest.fn(() => ({ where: mockWhere, get: mockQueryGet }));
const mockDoc = jest.fn(() => mockDocRef);

jest.mock("./firebase-db", () => ({
  getFirestoreDb: jest.fn(() => ({
    collection: mockCollection,
    doc: mockDoc,
  })),
}));

global.fetch = jest.fn();

const makeConfig = (type: "authenticated" | "anonymous" = "authenticated") => ({
  portalData: (type === "authenticated"
    ? {
        type: "authenticated" as const,
        database: { appName: "report-service-dev" as const, sourceKey: "test-source", rawFirebaseJWT: "raw-firebase-jwt" },
        resourceUrl: "http://example.com/resource",
        toolId: "ap",
        platformId: "https://learn.concord.org",
        platformUserId: "42",
        contextId: "ctx-1",
        resourceLinkId: "rl-1",
        runRemoteEndpoint: "http://example.com/runs/1",
        rawPortalJWT: "raw-jwt",
        basePortalUrl: "https://learn.concord.org",
        learnerKey: "lk-1",
        offering: { id: 1, activityUrl: "", rubricUrl: "", locked: false },
        userType: "learner" as const,
        rawClassInfo: null,
      }
    : {
        type: "anonymous" as const,
        database: { appName: "report-service-dev" as const, sourceKey: "test-source" },
        resourceUrl: "http://example.com/resource",
        toolId: "ap",
        runKey: "run-abc",
        toolUserId: "anonymous" as const,
        userType: "learner" as const,
      }) as any,
  getFirebaseJWT: jest.fn().mockResolvedValue("test-jwt-token"),
});

const makeJobInfo = (overrides: Partial<IJobInfo> = {}): IJobInfo => ({
  version: 1,
  id: "job-1",
  status: "queued",
  request: { task: "success" },
  createdAt: Date.now(),
  ...overrides,
});

describe("FirebaseJobExecutor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (firebaseJobExecutor as any).config = null;
    (firebaseJobExecutor as any).updateCallback = null;
    (firebaseJobExecutor as any).jobIdToInteractiveId = new Map();
    (firebaseJobExecutor as any).jobListeners = new Map();
  });

  describe("before configure()", () => {
    it("createJob returns failure job immediately", async () => {
      const job = await firebaseJobExecutor.createJob({ task: "success" });
      expect(job.status).toBe("failure");
      expect(job.result?.message).toMatch(/not configured/i);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("getJobs returns empty array", async () => {
      const jobs = await firebaseJobExecutor.getJobs({ interactiveId: "i-1" });
      expect(jobs).toEqual([]);
    });

    it("cancelJob resolves without throwing", async () => {
      await expect(firebaseJobExecutor.cancelJob("job-1")).resolves.toBeUndefined();
    });
  });

  describe("configure()", () => {
    it("is idempotent — second call is ignored", () => {
      const config1 = makeConfig();
      const config2 = makeConfig();
      configure(config1);
      configure(config2);
      expect((firebaseJobExecutor as any).config).toBe(config1);
    });
  });

  describe("createJob()", () => {
    beforeEach(() => configure(makeConfig()));

    it("POSTs to Cloud Function with Authorization header and returns IJobInfo", async () => {
      const job = makeJobInfo();
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => job,
      });
      const result = await firebaseJobExecutor.createJob(
        { task: "success" },
        { interactiveId: "i-1", user_type: "authenticated", platform_user_id: "42" }
      );
      expect(result).toEqual(job);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("cloudfunctions.net"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Authorization": "Bearer test-jwt-token" }),
        })
      );
    });

    it("sets up Firestore listener after successful job creation", async () => {
      const job = makeJobInfo();
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => job });
      await firebaseJobExecutor.createJob({ task: "success" }, { interactiveId: "i-1" });
      expect(mockDoc).toHaveBeenCalledWith(expect.stringContaining("job-1"));
      expect(mockOnSnapshot).toHaveBeenCalled();
    });

    it("returns failure job on HTTP error without throwing", async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal error",
      });
      const result = await firebaseJobExecutor.createJob({ task: "success" });
      expect(result.status).toBe("failure");
      expect(result.result?.message).toMatch(/500/);
    });

    it("returns failure job on network error without throwing", async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error("Network failure"));
      const result = await firebaseJobExecutor.createJob({ task: "success" });
      expect(result.status).toBe("failure");
    });
  });

  describe("onJobUpdate() + Firestore listener", () => {
    beforeEach(() => configure(makeConfig()));

    it("calls registered callback when Firestore document updates", async () => {
      const callback = jest.fn();
      firebaseJobExecutor.onJobUpdate(callback);
      const job = makeJobInfo();
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => job });
      await firebaseJobExecutor.createJob({ task: "success" });

      const updatedJob = makeJobInfo({ status: "success" });
      (mockOnSnapshot as any)._successCb({ exists: true, data: () => ({ jobInfo: updatedJob }) });
      expect(callback).toHaveBeenCalledWith(updatedJob);
    });

    it("emits failure job update on listener error", async () => {
      const callback = jest.fn();
      firebaseJobExecutor.onJobUpdate(callback);
      const job = makeJobInfo();
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => job });
      await firebaseJobExecutor.createJob({ task: "success" });
      (mockOnSnapshot as any)._errorCb(new Error("Permission denied"));
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({ status: "failure" }));
    });

    it("cleans up listener and mapping when job reaches final state", async () => {
      const job = makeJobInfo();
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => job });
      await firebaseJobExecutor.createJob({ task: "success" }, { interactiveId: "i-1" });

      const finalJob = makeJobInfo({ status: "success" });
      (mockOnSnapshot as any)._successCb({ exists: true, data: () => ({ jobInfo: finalJob }) });

      expect((firebaseJobExecutor as any).jobListeners.has("job-1")).toBe(false);
      expect((firebaseJobExecutor as any).jobIdToInteractiveId.has("job-1")).toBe(false);
    });
  });

  describe("getJobs()", () => {
    beforeEach(() => configure(makeConfig()));

    it("returns empty array if context has no interactiveId", async () => {
      const jobs = await firebaseJobExecutor.getJobs({ user_type: "authenticated" });
      expect(jobs).toEqual([]);
      expect(mockCollection).not.toHaveBeenCalled();
    });

    it("queries Firestore and returns backfilled jobs", async () => {
      const job = makeJobInfo({ status: "success" });
      mockQueryGet.mockResolvedValue({ docs: [{ data: () => ({ jobInfo: job }) }] });
      const jobs = await firebaseJobExecutor.getJobs({
        interactiveId: "i-1",
        user_type: "authenticated",
        platform_user_id: "42",
      });
      expect(jobs).toEqual([job]);
    });

    it("sets up Firestore listener for non-final backfilled jobs", async () => {
      const runningJob = makeJobInfo({ status: "running" });
      mockQueryGet.mockResolvedValue({ docs: [{ data: () => ({ jobInfo: runningJob }) }] });
      await firebaseJobExecutor.getJobs({
        interactiveId: "i-1",
        user_type: "authenticated",
        platform_user_id: "42",
      });
      expect(mockDoc).toHaveBeenCalled();
      expect(mockOnSnapshot).toHaveBeenCalled();
    });

    it("does NOT set up listener for final backfilled jobs", async () => {
      const successJob = makeJobInfo({ status: "success" });
      mockQueryGet.mockResolvedValue({ docs: [{ data: () => ({ jobInfo: successJob }) }] });
      await firebaseJobExecutor.getJobs({ interactiveId: "i-1" });
      expect(mockOnSnapshot).not.toHaveBeenCalled();
    });

    it("returns empty array and logs error on Firestore failure", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(jest.fn());
      mockQueryGet.mockRejectedValue(new Error("Permission denied"));
      const jobs = await firebaseJobExecutor.getJobs({ interactiveId: "i-1" });
      expect(jobs).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("getJobs failed"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("cancelJob()", () => {
    beforeEach(() => configure(makeConfig()));

    it("POSTs with Authorization header and context for authenticated users", async () => {
      const job = makeJobInfo();
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => job });
      await firebaseJobExecutor.createJob({ task: "success" }, { interactiveId: "i-1" });

      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      await firebaseJobExecutor.cancelJob("job-1");
      // cancelJob is fire-and-forget; flush the microtask queue
      await Promise.resolve();

      const cancelCall = (fetch as jest.Mock).mock.calls[1];
      const body = JSON.parse(cancelCall[1].body);
      expect(body.action).toBe("cancel");
      expect(body.jobId).toBe("job-1");
      expect(body.context).toBeDefined();
      expect(cancelCall[1].headers.Authorization).toMatch(/^Bearer /);
    });

    it("omits Authorization header and sends run_key in context for anonymous users", async () => {
      (firebaseJobExecutor as any).config = null;
      const anonConfig = makeConfig("anonymous");
      anonConfig.getFirebaseJWT.mockResolvedValue("");
      configure(anonConfig);

      const job = makeJobInfo();
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => job });
      await firebaseJobExecutor.createJob({ task: "success" }, { interactiveId: "i-1" });

      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      await firebaseJobExecutor.cancelJob("job-1");
      await Promise.resolve();

      const cancelCall = (fetch as jest.Mock).mock.calls[1];
      const body = JSON.parse(cancelCall[1].body);
      expect(body.context.run_key).toBe("run-abc");
      expect(cancelCall[1].headers.Authorization).toBeUndefined();
    });

    it("resolves without throwing even if fetch fails", async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error("Network failure"));
      await expect(firebaseJobExecutor.cancelJob("job-1")).resolves.toBeUndefined();
    });
  });

  describe("removeInteractive()", () => {
    beforeEach(() => configure(makeConfig()));

    it("unsubscribes Firestore listeners for jobs owned by that interactive", async () => {
      const job = makeJobInfo();
      (fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => job });
      await firebaseJobExecutor.createJob({ task: "success" }, { interactiveId: "i-1" });
      expect(mockUnsubscribe).not.toHaveBeenCalled();
      firebaseJobExecutor.removeInteractive("i-1");
      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it("does not affect listeners for other interactives", async () => {
      const job1 = makeJobInfo({ id: "job-1" });
      const job2 = makeJobInfo({ id: "job-2" });
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => job1 })
        .mockResolvedValueOnce({ ok: true, json: async () => job2 });
      await firebaseJobExecutor.createJob({ task: "success" }, { interactiveId: "i-1" });
      await firebaseJobExecutor.createJob({ task: "success" }, { interactiveId: "i-2" });
      firebaseJobExecutor.removeInteractive("i-1");
      expect((firebaseJobExecutor as any).jobListeners.has("job-2")).toBe(true);
    });
  });
});
