# Keep the Portal JWT Fresh for Long Sessions

**Jira**: https://concord-consortium.atlassian.net/browse/AP-139
**Repo**: https://github.com/concord-consortium/activity-player
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **In Development**

## Overview

A student who keeps an activity open for more than an hour can no longer submit with "I'm Done!", because the Activity Player gets a one-hour portal JWT at launch and never renews it. This change keeps that JWT renewed for as long as the page is open, along with the Firebase token that interactives' object storage signs in with. When renewal becomes impossible, the student sees a readable "relaunch" message instead of "Unexpected error: Signature has expired".

## Project Owner Overview

Class periods, block schedules and after-school sessions often run past an hour, and a student who launched an activity at the start of one sees their final submission fail at the end. The failure is also confusing: the button shows a library error the student cannot act on, and reloading does not help. At the moment the only way out is to relaunch from the portal, which nothing on screen tells them to do.

After this change the Activity Player renews its portal credential in the background and on demand, so a long session behaves like a short one. The one case it cannot recover from is a laptop that slept past the credential's expiry. There the student is told plainly to close the tab and relaunch the activity, the same instruction the launch-failure screen already gives.

## Background

The Jira story's Cause section is the authoritative account and is not repeated here. Its load-bearing claims were checked against the code:

- The launch URL's `token=` is itself a portal JWT with a 180-second life (`rigse` `ExternalActivity`, `create_portal_token(..., 180)`; also `CreateCollaboration` for collaborative launches). `app.tsx` `componentDidMount` exchanges it once through `fetchPortalJWT` for a one-hour portal JWT (`PortalTokenClaims::STANDARD_TTL = 3600`).
- That JWT is copied into `IPortalData.rawPortalJWT` and read by every later caller that needs a Firebase JWT from `api/v1/jwt/firebase`:
  - `handleGetFirebaseJWT` (`src/portal-utils.ts`), which serves both the job executor (`configureJobExecutor` in `app.tsx`, used by `createJob`/`cancelJob` behind "I'm Done!") and interactives' `getFirebaseJWT` requests (`managed-interactive.tsx`, via `iframe-runtime.tsx`);
  - `getFirebaseJwtFromPortal` in `src/lara-plugin/plugins/plugin-context.ts` (plugins' `getFirebaseJwt`);
  - `getAttachmentsManagerOptions`, once, at startup.
- **Verified by throwaway test**: a portal 400 `{"message":"Signature has expired"}` reaches `getFirebaseJWT`'s rejection as the plain string `"Signature has expired"` (not an `Error`, no status), and `FirebaseJobExecutor.createJob`'s catch-all turns it into the failure job message `Unexpected error: Signature has expired`. The question-interactives button renders `result.message` verbatim, which is what the student saw.
- **Verified against a local portal** (a `rails runner` integration session on the rigse RIGSE-368 branch, whose auth path for an unscoped learner JWT behaves the same as master's): calling `GET api/v1/jwt/portal` with `Authorization: Bearer/JWT <portal JWT>` returns 201 and a new JWT whose claims (`domain`, `user_type`, `user_id`, `learner_id`, `class_info_url`, `offering_id`, `admin`, `project_admins`, `uid`, `iss`, `alg`) are identical to the original except `iat`/`exp`, with a fresh 3600-second life. No `as_learner`/`offering_id` parameters are needed: `check_for_auth_token` restores the learner from the token's `learner_id`, and `handle_initial_auth` keeps it. The same call with an expired portal JWT returns 400 `Signature has expired`.
- Only the learner path keeps a portal JWT. The teacher / OAuth path (`user_type` `teacher` or undefined) uses the anonymous database and configures no Firebase JWT source, so it is unaffected.
- Saving answers is not affected: Firestore uses a Firebase Auth session created by `signInWithCustomToken`, which renews its own ID token with its refresh token and never goes back to the portal.

## Requirements

**Token lifecycle**

- R1. The Activity Player keeps the learner's portal JWT in a single owner. Every caller that sends a portal JWT after startup gets the current token from that owner rather than from a copy taken at launch. After this change, no code path reads a launch-time copy of the raw portal JWT.
- R2. Before the token goes stale, the owner re-mints it by calling `api/v1/jwt/portal` with `Authorization: Bearer/JWT <current token>`. "Stale" means 80% of the token's lifetime (`exp - iat`) has elapsed, which is 48 minutes for today's one-hour token.
- R3. When a caller asks for the token and it is stale or expired, the owner refreshes it before answering. A background timer is not enough on its own, because timers stall in background tabs and on sleeping laptops. A caller never waits on a refresh indefinitely: the refresh request has a bounded timeout (superagent has none by default), and a timeout is a refresh failure under R7.
- R4. Concurrent callers share one in-flight refresh. N callers arriving while a refresh is pending cause one portal request, and all N get its result.
- R5. Elapsed lifetime is measured from when the Activity Player received the token, using the token's own `exp - iat` as its length. A device clock that disagrees with the portal's clock must not cause early expiry, late expiry, or a refresh loop. The local measure is an estimate: when the portal itself refuses the token as expired (`Signature has expired`), the token is expired, whatever the local measure says.
- R6. A refreshed token replaces the current one only when its identity claims match the original's: `uid`, `user_type`, `learner_id`, `offering_id` and `class_info_url`. A mismatch counts as a refresh failure. Other claims (`admin`, `project_admins`) are recomputed by the portal on every mint and may legitimately change.
- R7. When a refresh fails but the current token has not yet expired, callers keep getting the current token, and the next request or timer tick tries the refresh again. A transient network error must not end the session early.

**Failure message**

- R8. When the token has expired and cannot be refreshed, or when the portal refuses a Firebase JWT request because the portal JWT has expired, every caller that needed it fails with one readable message that tells the student to close the tab and relaunch the activity (exact text in Technical Notes). The message appears:
  - as the "I'm Done!" job failure message (`createJob`), in place of `Unexpected error: Signature has expired` and without the `Unexpected error:` prefix;
  - as the `message` of the `firebaseJWT` error response to an interactive's `getFirebaseJWT` request;
  - as the rejection reason of a plugin's `getFirebaseJwt`.
- R9. An unrecoverable refresh does not replace the activity with a full-page error. Answers keep saving through Firestore's own session, so the student can keep working. The message appears only where a caller actually needed the portal.

**Object storage**

- R12. An interactive that starts after its launch-time report-service Firebase JWT has gone stale gets a current one in `objectStorageConfig.user.jwt`. One re-mint, made through the portal JWT owner (R1), serves every interactive that starts while it is fresh. If no current token can be had, the interactive still starts, with the launch token as today. An interactive that unmounts while its token is pending is never sent `initInteractive`.

**Scope guards**

- R10. Nothing changes for anonymous runs, preview / Teacher Edition, or the teacher / OAuth path.

**Tests**

- R11. Unit tests cover:
  - the timer refresh at 80% of the lifetime;
  - on-demand refresh when the token is stale;
  - on-demand refresh when the token is expired;
  - a single shared refresh for concurrent callers (asserting the request count);
  - callers after a refresh sending the new token, not the original, in the `Authorization` header;
  - a refresh that times out;
  - the portal refusing a token that the local measure still considers fresh;
  - keeping the current token when a refresh fails before expiry;
  - rejecting a refreshed token whose claims differ;
  - skew independence, with a device clock offset from `iat`;
  - on-demand refresh of a locally expired token that the portal still accepts;
  - the readable message at each of the three surfaces in R8, which must no longer contain `Signature has expired`;
  - at the app level: a learner launch creates the token owner and the object-storage token; teacher and anonymous runs create neither (R10); and an expired session reported to a caller leaves `errorType` unset (R9);
  - R12: a stale object-storage token is re-minted once for concurrent callers and then reused; the interactive receives the new token; a failed re-mint falls back to the held token before expiry; no `initInteractive` is sent after unmount.

## Technical Notes

- **Relaunch message.** The Jira proposal says "return to the portal", but AP-69 deliberately removed "portal" from student-facing text in favor of "close this tab and relaunch the activity" (`src/components/error/error.tsx`, `auth-instruction`). Follow AP-69: "Your session has expired. Please close this tab and relaunch the activity." `errorMsg.timeout` already says "Your session has expired." The message should be built from that shared text, not a second copy of it.
- **Refresh request.** The call is the existing `GET {basePortalUrl}api/v1/jwt/portal` with `Authorization: Bearer/JWT <jwt>`, the same header `getFirebaseJWT` sends. The portal answers `201 {"token": ...}`, which `getPortalJWTWithBearerToken` already parses. It is called today only with `Bearer <launch token>`.
- **Clock.** The portal sets `iat` to its own `Time.now`, so `iat` is a server timestamp. Measuring from receipt time on the client's monotonic-enough clock (`Date.now()` at receipt plus `exp - iat`) avoids trusting the device's absolute time.
- **Why an expired token cannot be rescued.** AP runs on a different origin from the portal and sends no portal cookies (superagent without `withCredentials`), and the launch token in the URL lasted only 180 seconds. Once the portal JWT itself has expired, AP has no credential left to re-mint with.
- **Portal compatibility.** On rigse master, `JwtController#reject_credential_issuing_callers` refuses tokens carrying `minted_via_oidc_client_id`, and learner launch tokens do not carry it. On the unmerged RIGSE-367/368 work, `accepts_no_token_capabilities` on `JwtController` restricts only scoped tokens, and a learner JWT has no `scope` claim (`TokenScope.apply!` leaves `Current.token_scope` nil), so re-minting keeps working after those land. No portal change is needed.
- **How each surface stringifies a rejection (verified by throwaway test).** `iframe-runtime.tsx`'s `getFirebaseJWT` listener reports `e.toString()`, and `createJob`'s catch-all reports `String(error)`. Both turn `new Error(msg)` into `"Error: msg"`, and both leave a string rejection unchanged. For R8's text to arrive exactly, each surface has to recognize the session-expired failure and report its bare message.
- **Timeout shape (verified by throwaway test).** `superagent.timeout(ms)` fails with an `Error` whose `code` is `ECONNABORTED` and whose response is `undefined`, so `getErrorMessage` passes the `Error` itself through. It carries no portal message, so it is a transient failure under R7, not an expiry.
- **No new exposure from renewal.** A holder of a valid portal JWT could already call `api/v1/jwt/portal` to extend it; AP now uses that existing capability. The token stays in memory only and is not written to storage or logs.
- **Existing tests that seed `rawPortalJWT`** in portal data (`portal-utils.test.ts`, `plugin-context.spec.ts`, `get-attachments-manager-options.test.ts`, `firebase-job-executor.test.ts` fixtures) will need to follow R1.
- **Firestore save path.** `signInWithToken` (`src/firebase-db.ts`) signs in once with the custom token, and the Firebase SDK refreshes the ID token hourly with its refresh token. It does not touch the portal JWT.

## Out of Scope

- Surviving a page reload. The URL's launch token expired minutes after launch. Persisting the portal JWT in browser storage so a reload could reuse it would be a new credential-at-rest decision.
- Recovering after the portal JWT has actually expired (for example, a laptop asleep past `exp`). There is no credential left to renew with; see Technical Notes.
- Portal changes, including longer token lifetimes.
- Renewing the attachments manager's token-service JWT. It needs an optional token source in `interactive-api-host`'s `IAttachmentsManagerInitOptions`, which is [LARA-223](https://concord-consortium.atlassian.net/browse/LARA-223); once that is released, AP passes a source that mints through the portal JWT owner (see Open Questions).
- The teacher / OAuth path, which does not keep a portal JWT.
- The idle-warning and session-timeout flow (`IdleDetector`, 20 + 5 minutes). It is unchanged, and it is independent of token expiry.

## Open Questions

### RESOLVED: Judgment call: Where does the unrecoverable-session message appear?
**Context**: The Jira says "show a clear message" without saying where.
**Options considered**:
- A) As the failure message at the surface that needed the token (job failure, interactive error response, plugin rejection), leaving the page usable.
- B) Also switch the whole app to the existing `auth` error screen.

**Decision**: A. Firestore saves keep working on their own session (Background), so a full-page error would take away a working activity to report that one feature failed. The "I'm Done!" button already renders the job's failure message, which is exactly where the student is looking.

### RESOLVED: Judgment call: Message wording
**Context**: The Jira proposes "return to the portal and relaunch", but AP-69 removed "portal" from student-facing copy.
**Options considered**:
- A) Follow AP-69: "Your session has expired. Please close this tab and relaunch the activity."
- B) Use the Jira wording verbatim.

**Decision**: A. It is consistent with the existing auth screen, and the Jira's "such as" marks its wording as an example rather than a requirement.

### RESOLVED: Judgment call: One staleness threshold for both the timer and on-demand refresh
**Context**: The Jira gives 80% for the timer and "expired or close to it" for on-demand refresh.
**Options considered**:
- A) One threshold, 80% of lifetime, for both.
- B) A separate, smaller on-demand margin (for example, the last 5 minutes).

**Decision**: A. One rule is easier to test and reason about. On-demand refresh at 80% costs at most one extra portal request per 48 minutes, and it covers a stalled timer the moment a caller arrives.

### RESOLVED: Scope: the attachments manager's token-service JWT
**Context**: `getAttachmentsManagerOptions` mints a `token-service` Firebase JWT once at startup and hands it to `AttachmentsManager`, which keeps it as `this.firebaseJwt` for every token-service call. The token service checks `exp` (`verify(token, publicKey, { algorithms: ["RS256"] })` in `token-service/functions/src/index.ts`), so attachment reads and writes (audio and image uploads) should fail after an hour, which is the same bug class.
**Options considered**:
- A) Out of scope, with a follow-up story.
- B) In scope.

**Decision**: A. `interactive-api-host` builds `AttachmentsManager` once behind a module-level promise (`initializeAttachmentsManager` resolves it a single time) and has no way to swap the JWT, so a fix needs a new API in that library first. It is a cross-repo change with its own release, not a portal-JWT fix. The startup call still moves to the token owner (R1), so AP can mint on demand once [LARA-223](https://concord-consortium.atlassian.net/browse/LARA-223) adds that token source. Not reproduced end to end.

### RESOLVED: Scope: the report-service custom token handed to interactives' object storage
**Context**: `iframe-runtime.tsx` puts `portalData.database.rawFirebaseJWT`, the report-service custom token minted once at launch, into every interactive's `objectStorageConfig.user.jwt`. `@concord-consortium/object-storage` (`FirebaseObjectStorage.initialize`) calls `signInWithCustomToken` with it when the interactive starts, and Firebase refuses an expired custom token. AP mounts only the current page's interactives, so an object-storage interactive (question-interactives' `graph`, `live-graph` and `agent-simulation` use it) that first loads on a page reached more than an hour after launch should fail to sign in. That is the same bug for a different credential. Not reproduced end to end. The fix would sit in AP: mint a fresh report-service Firebase JWT from the current portal JWT when building `initInteractive`, which makes that step asynchronous.
**Options considered**:
- A) Out of scope; file a follow-up story, since the Jira names only the portal JWT's three callers.
- B) In scope, as an extra requirement and acceptance criterion.

**Decision**: B, in scope (Doug, 2026-09-30); see R12. The token is cached and shared rather than minted per interactive, so a page of interactives costs at most one portal round trip per stale period.

## Self-Review

Roles: Senior Engineer, Security Engineer, QA Engineer, Student. Each item below was checked against the code before it was recorded, and all were fixed in place.

### Senior Engineer

#### RESOLVED: A caller could wait forever on a hung refresh
R3 made callers wait for a refresh, but superagent 10.3.0 sets no timeout unless `.timeout()` is called (`request-base.js`: `_timeout` is set only by `timeout()`), and `src/` calls it nowhere. A stalled portal request would hang "I'm Done!" while the current token was still valid. R3 now requires a bounded refresh timeout that falls through to R7.

#### RESOLVED: The local lifetime measure is not authoritative
R5 measured elapsed time locally, but a local clock can be wrong: the wall clock can be changed mid-session, and `performance.now()` pauses during system sleep on some platforms. If the measure said "fresh" and the portal disagreed, the caller would get the raw `Signature has expired`. R5 now treats the portal's refusal as authoritative, and R8 covers a refusal on a Firebase JWT request as well as on a refresh.

### Security Engineer

#### RESOLVED: Comparing every claim would reject legitimate refreshes
R6 compared all claims except `iat`/`exp`, but `PortalTokenClaims#add_admin_claims` recomputes `admin` and `project_admins` from the user's current roles on every mint. A role change during a session would therefore have ended the session. R6 now compares the identity claims only, which is what the Jira acceptance criterion names ("same user, learner and class").

### QA Engineer

#### RESOLVED: No test proved that callers actually use the refreshed token
R11 could pass with a manager that refreshed and then kept handing out the original token. A test now asserts the `Authorization` header after a refresh, and tests cover the timeout and the portal-refusal paths added above.

### Student

#### RESOLVED: The job message kept the "Unexpected error:" prefix
`createJob`'s catch-all prefixes every error with `Unexpected error:`, so passing the readable text through it unchanged would still read as a crash. R8 now requires the message without the prefix.

