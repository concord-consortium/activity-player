# Add Job Manager Support to Activity Player

**Jira**: https://concord-consortium.atlassian.net/browse/AP-68

**Status**: **Closed**

## Overview

Add host-side job manager support to the Activity Player so that iframed interactives (starting with the button interactive) can create and track background jobs via the LARA interactive API. The Activity Player implements `IJobExecutor`, which calls a Firebase Cloud Function per-environment and listens for real-time status updates via Firestore.

## Requirements

- The Activity Player must implement `IJobExecutor` in a new `src/firebase-job-executor.ts` file; all Firebase SDK access goes through `firebase-db.ts` imports — no direct Firebase SDK calls in the executor
- `firebase-db.ts` must export a `getFirestoreDb()` helper that returns `app.firestore()`, so the executor can access the already-initialized Firestore instance without coupling to the Firebase SDK directly
- `createJob(request, context?)` must call the Firebase Cloud Function at `https://us-central1-${projectId}.cloudfunctions.net/submitTask` via HTTP POST with a JSON body containing both the `request` fields (task + task params) and the `context` fields (user identity); for authenticated users it must send a Firebase JWT as a Bearer token in the Authorization header; for anonymous users the Authorization header is omitted and the Cloud Function verifies identity via `run_key` in the POST body context; both calls set `Content-Type: application/json`
- The Firebase Cloud Function name is `submitTask` — a named constant in `firebase-job-executor.ts`
- `createJob` must never reject — on any error, it must return `IJobInfo` with `status: "failure"` and a descriptive `result.message`; if the executor has not been configured yet, `createJob` must immediately return a failure job with a clear message rather than throwing or hanging
- The Cloud Function must return a full `IJobInfo` JSON response (at minimum `{ version, id, status, request, createdAt }`) — coordination requirement with the backend team; the executor returns this object directly as the resolved value of `createJob` and uses `id` to construct the Firestore listener path
- After calling the Cloud Function, `createJob` must set up a Firestore document listener at `sources/{sourceKey}/jobs/{id}` (where `id` comes from the Cloud Function response) to receive real-time status updates; the job info is stored under the `jobInfo` key within the document (i.e. `snapshot.data().jobInfo`); updates must be delivered to the registered `onJobUpdate` callback
- If the Firestore document listener fails to establish or encounters an error, the executor must emit a `"failure"` job update for the affected job so the interactive does not hang indefinitely waiting for a status update
- `getJobs(context?)` must return an empty array (not throw) if the executor has not yet been configured, or if `context` is missing or lacks an `interactiveId`; otherwise it must query the `sources/{sourceKey}/jobs` Firestore collection filtered by `interactiveId` plus the appropriate user identity fields from the context to backfill the interactive after page reload; after returning, `getJobs` must set up Firestore listeners for any backfilled jobs with non-final status (`"queued"` or `"running"`) and populate the `jobId → interactiveId` mapping for those jobs using the context passed to `getJobs`; results must be sorted by `jobInfo.createdAt` ascending
- The Firestore job document written by the Cloud Function must have the structure `{ jobInfo: IJobInfo, interactiveId, ...userIdentityFields }` — `jobInfo` holds the full job object; `interactiveId` and user identity fields (`platform_user_id` or `run_key`) are stored at the root for Firestore query filtering — backend coordination requirement
- The Firestore security rules for `sources/{sourceKey}/jobs` must follow the same `studentWorkCreate/Read` pattern as answers: authenticated learners verified via Firebase JWT claims, and anonymous users verified via `run_key` presence — backend coordination requirement
- `cancelJob(jobId)` must call the same Firebase Function URL via HTTP POST with a JSON body `{ action: "cancel", jobId, context }`; `context` is built from the stored `jobId → interactiveId` mapping and `portalData`; `cancelJob` is fire-and-forget and must not reject
- `onJobUpdate(callback)` must register the callback so the executor calls it whenever any job's Firestore document changes
- The executor must be a module-level singleton configured via a `configure({ portalData, getFirebaseJWT })` call when portal data resolves — before any interactive loads; `configure()` is idempotent after the first call — subsequent calls are ignored
- A `JobManager` instance must be created as a module-level singleton in `iframe-runtime.tsx`, wired with the executor, following the `PubSubManager` pattern; `addInteractive(id, phone, context)` must always be called (not guarded by a null check) so job message handlers are always registered
- `addInteractive` must be called in both runtime and report mode so that job info is available for display in report views
- The executor must maintain an internal `jobId → interactiveId` mapping, populated when `createJob` is called, so it can identify and clean up the correct Firestore listeners when `removeInteractive(id)` is called
- `removeInteractive(id)` must be called in the `useEffect` cleanup — the executor must clean up any Firestore listeners for jobs owned by that interactive
- `configure()` must be called for both authenticated learners (with a portal-minted Firebase JWT) and anonymous users (with an empty-string JWT, relying on `run_key` for identity); teacher preview is intentionally excluded — teachers view read-only student work and do not need job execution
- `@concord-consortium/interactive-api-host` must be updated to `^0.11.0-pre.0` and `@concord-consortium/lara-interactive-api` to `1.13.0-pre.2`; when stable versions ship, `package.json` must be manually updated (pre-release `^` semver does not auto-resolve to stable)

## Technical Notes

- **Firebase project names**: `"report-service-dev"` (staging) and `"report-service-pro"` (production) — see `FirebaseAppName` in `src/firebase-db.ts`
- **Cloud Function URL**: `https://us-central1-${appName}.cloudfunctions.net/submitTask` (prod) or `http://localhost:5001/${appName}/us-central1/submitTask` (emulator via `?emulator=true` query param)
- **Firebase emulator**: Firestore on port 9090, Functions on port 5001, enabled via `?emulator=true`; `firebase-db.ts` conditionally calls `app.firestore().useEmulator("localhost", 9090)` when the param is set
- **Firestore document path**: `sources/{sourceKey}/jobs/{jobId}` — consistent with existing source-namespaced pattern; job info stored at `jobInfo` key, user identity fields at root
- **User identity context** — based on `createAnswerDoc` fields, with `user_type` added:
  ```typescript
  // authenticated
  { interactiveId, user_type: "authenticated", source_key, resource_url, tool_id,
    platform_id, platform_user_id, context_id, resource_link_id, remote_endpoint }
  // anonymous
  { interactiveId, user_type: "anonymous", source_key, resource_url, tool_id,
    run_key, tool_user_id: "anonymous", platform_user_id: portalData.runKey }
  ```
- **`buildJobContext`**: exported from `firebase-job-executor.ts`; imported by `iframe-runtime.tsx` — service module dependency direction (UI depends on service, not vice versa)
- **`handleGetFirebaseJWT`** from `portal-utils.ts` is the correct export for fetching a portal-minted Firebase JWT (not `getFirebaseJwtFromPortal` in `plugin-context.ts`, which is module-private)
- **Composite Firestore indexes required**: `(interactiveId, platform_user_id)` and `(interactiveId, run_key)` in both Firebase projects — backend team must create these for `getJobs` queries to work
- **Relevant files**:
  - `src/firebase-job-executor.ts` — new file: `FirebaseJobExecutor` implementing `IJobExecutor`
  - `src/firebase-job-executor.test.ts` — new file: 21 unit tests
  - `src/components/activity-page/managed-interactive/iframe-runtime.tsx` — `JobManager` wiring
  - `src/firebase-db.ts` — added `getFirestoreDb()` export and emulator support
  - `src/components/app.tsx` — `configure()` calls after portal data resolves

## Out of Scope

- The Firebase Cloud Function itself — this story is host-side wiring only
- UI changes in the Activity Player for job status display (handled by the button interactive)
- The mock/fake executor in the QI demo harness (already implemented in question-interactives)
- Job persistence / retrieval history beyond what the Firebase function provides
- Authorization beyond what the existing portal JWT flow provides
- Host-side gating of `createJob`/`cancelJob` in report mode — interactives are responsible for not calling these in report mode
- Changes to the LARA interactive API client or `JobManager` routing logic (those belong in LARA-210)
