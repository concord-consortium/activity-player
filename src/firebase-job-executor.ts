import { IJobExecutor, IJobInfo } from "@concord-consortium/interactive-api-host";
import { IPortalData, IAnonymousPortalData } from "./portal-types";
import { getFirestoreDb } from "./firebase-db";

const useEmulator =
  typeof window !== "undefined"
    ? new URLSearchParams(window.location.search).get("emulator") === "true"
    : false;
if (useEmulator) {
  console.warn("[FirebaseJobExecutor] Using Firebase Functions emulator at localhost:5001");
}

const getFunctionUrl = (appName: string) =>
  useEmulator
    ? `http://localhost:5001/${appName}/us-central1/submitTask`
    : `https://us-central1-${appName}.cloudfunctions.net/submitTask`;

interface IConfig {
  portalData: IPortalData | IAnonymousPortalData;
  getFirebaseJWT: (appName: string) => Promise<string>;
}

type Unsubscribe = () => void;

/**
 * Builds the user identity context object sent to the Cloud Function and used
 * for Firestore query filtering. Exported so iframe-runtime.tsx can pass the
 * same context shape to jobManager.addInteractive().
 */
export const buildJobContext = (
  interactiveId: string,
  portalData: IPortalData | IAnonymousPortalData | undefined
): Record<string, any> | undefined => {
  if (!portalData) return undefined;
  if (portalData.type === "authenticated") {
    return {
      interactiveId,
      user_type: "authenticated",
      source_key: portalData.database.sourceKey,
      resource_url: portalData.resourceUrl,
      tool_id: portalData.toolId,
      platform_id: portalData.platformId,
      platform_user_id: portalData.platformUserId.toString(),
      context_id: portalData.contextId,
      resource_link_id: portalData.resourceLinkId,
      remote_endpoint: portalData.runRemoteEndpoint,
    };
  }
  return {
    interactiveId,
    user_type: "anonymous",
    source_key: portalData.database.sourceKey,
    resource_url: portalData.resourceUrl,
    tool_id: portalData.toolId,
    run_key: portalData.runKey,
    tool_user_id: "anonymous",
    platform_user_id: portalData.runKey,
  };
};

class FirebaseJobExecutor implements IJobExecutor {
  private config: IConfig | null = null;
  private updateCallback: ((job: IJobInfo) => void) | null = null;
  // jobId → interactiveId: needed to route listener cleanup to the right interactive
  private jobIdToInteractiveId: Map<string, string> = new Map();
  // jobId → Firestore unsubscribe function
  private jobListeners: Map<string, Unsubscribe> = new Map();

  configure(config: IConfig): void {
    if (this.config) return; // idempotent — ignore subsequent calls
    this.config = config;
  }

  async createJob(
    request: { task: string } & Record<string, any>,
    context?: Record<string, any>
  ): Promise<IJobInfo> {
    if (!this.config) {
      return this.makeFailureJob(request, "Job executor not configured — portal data has not resolved yet.");
    }
    try {
      const { portalData, getFirebaseJWT } = this.config;
      const appName = portalData.database.appName;
      const token = await getFirebaseJWT(appName);
      const url = getFunctionUrl(appName);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      // Authenticated users send a Firebase JWT; anonymous users omit the header
      // and rely on run_key in the POST body context for Cloud Function verification.
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ request, context }),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        let detail = text;
        try {
          const parsed = JSON.parse(text);
          if (parsed?.result?.message) {
            detail = parsed.result.message;
          }
        } catch { /* use raw text */ }
        return this.makeFailureJob(
          request,
          `Cloud Function error (${response.status})${detail ? `: ${detail}` : ""}`
        );
      }

      const job: IJobInfo = await response.json();

      // Populate jobId → interactiveId mapping for listener cleanup
      if (context?.interactiveId) {
        this.jobIdToInteractiveId.set(job.id, context.interactiveId);
      }

      // Set up Firestore listener for real-time status updates
      this.subscribeToJob(job.id);

      return job;
    } catch (error) {
      return this.makeFailureJob(request, `Unexpected error: ${String(error)}`);
    }
  }

  cancelJob(jobId: string): Promise<void> {
    // Fire-and-forget — errors are silently discarded
    if (this.config) {
      const { portalData, getFirebaseJWT } = this.config;
      const appName = portalData.database.appName;
      // Recover interactiveId so we can build a full context for CF identity verification.
      // Anonymous users rely on run_key in the context body (no Authorization header).
      const interactiveId = this.jobIdToInteractiveId.get(jobId) ?? "";
      const context = buildJobContext(interactiveId, portalData);
      getFirebaseJWT(appName)
        .then(token => {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) {
            headers.Authorization = `Bearer ${token}`;
          }
          return fetch(getFunctionUrl(appName), {
            method: "POST",
            headers,
            body: JSON.stringify({ action: "cancel", jobId, context }),
          });
        })
        .catch(() => { /* intentionally silent */ });
    }
    return Promise.resolve();
  }

  async getJobs(context?: Record<string, any>): Promise<IJobInfo[]> {
    if (!this.config || !context?.interactiveId) {
      return [];
    }
    const { portalData } = this.config;
    const { sourceKey } = portalData.database;
    try {
      const db = getFirestoreDb();
      // Build query: filter by interactiveId plus the key user identity discriminator
      let query = db
        .collection(`sources/${sourceKey}/jobs`)
        .where("interactiveId", "==", context.interactiveId);

      // Scope to this specific user/run to avoid cross-user data leakage.
      // If we cannot determine a valid user identity, do not query at all.
      let hasUserScope = false;
      if (context.user_type === "authenticated" && context.platform_user_id) {
        query = query
          .where("platform_user_id", "==", context.platform_user_id)
          .where("platform_id", "==", context.platform_id)
          .where("context_id", "==", context.context_id)
          .where("resource_link_id", "==", context.resource_link_id);
        hasUserScope = true;
      } else if (context.user_type === "anonymous" && context.run_key) {
        query = query.where("run_key", "==", context.run_key);
        hasUserScope = true;
      }

      if (!hasUserScope) {
        return [];
      }

      const snapshot = await query.get();
      const jobs: IJobInfo[] = snapshot.docs
        .map(doc => doc.data()?.jobInfo as IJobInfo | undefined)
        .filter((job): job is IJobInfo => !!job && typeof job.createdAt === "number")
        .sort((a, b) => a.createdAt - b.createdAt);

      // Set up listeners for non-final backfilled jobs so status updates arrive.
      // Note: onSnapshot fires immediately with the current document state when
      // first attached, so any job that finishes between the query above and the
      // subscribe call here will still deliver its final status via the snapshot.
      for (const job of jobs) {
        if (job.status === "queued" || job.status === "running") {
          this.jobIdToInteractiveId.set(job.id, context.interactiveId);
          this.subscribeToJob(job.id);
        }
      }

      return jobs;
    } catch (error) {
      console.error("[FirebaseJobExecutor] getJobs failed:", error);
      return [];
    }
  }

  onJobUpdate(callback: (job: IJobInfo) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Not part of IJobExecutor — called by iframe-runtime.tsx cleanup alongside
   * jobManager.removeInteractive(id) to tear down Firestore listeners for all
   * jobs that belong to the given interactive.
   */
  removeInteractive(interactiveId: string): void {
    for (const [jobId, id] of Array.from(this.jobIdToInteractiveId.entries())) {
      if (id === interactiveId) {
        this.jobListeners.get(jobId)?.();
        this.jobListeners.delete(jobId);
        this.jobIdToInteractiveId.delete(jobId);
      }
    }
  }

  private subscribeToJob(jobId: string): void {
    if (!this.config) return;
    // Don't create duplicate listeners
    if (this.jobListeners.has(jobId)) return;

    const { sourceKey } = this.config.portalData.database;
    const db = getFirestoreDb();

    const unsubscribe = db
      .doc(`sources/${sourceKey}/jobs/${jobId}`)
      .onSnapshot(
        snapshot => {
          if (!snapshot.exists) return;
          const job = snapshot.data()?.jobInfo as IJobInfo | undefined;
          if (!job || !job.status) return;
          this.updateCallback?.(job);
          // Auto-clean listener once job reaches a final state
          if (job.status !== "queued" && job.status !== "running") {
            unsubscribe();
            this.jobListeners.delete(jobId);
            this.jobIdToInteractiveId.delete(jobId);
          }
        },
        error => {
          // Emit a failure update so the interactive doesn't hang indefinitely
          const failureJob: IJobInfo = {
            version: 1,
            id: jobId,
            status: "failure",
            request: { task: "" },
            result: { message: `Listener error: ${error.message}` },
            createdAt: Date.now(),
            completedAt: Date.now(),
          };
          this.updateCallback?.(failureJob);
          this.jobListeners.delete(jobId);
          this.jobIdToInteractiveId.delete(jobId);
        }
      );

    this.jobListeners.set(jobId, unsubscribe);
  }

  private makeFailureJob(
    request: { task: string } & Record<string, any>,
    message: string
  ): IJobInfo {
    const now = Date.now();
    return {
      version: 1,
      id: `failure-${now}-${Math.random().toString(36).slice(2)}`,
      status: "failure",
      request,
      result: { message },
      createdAt: now,
      completedAt: now,
    };
  }
}

export const firebaseJobExecutor = new FirebaseJobExecutor();

export const configure = (config: IConfig): void =>
  firebaseJobExecutor.configure(config);
