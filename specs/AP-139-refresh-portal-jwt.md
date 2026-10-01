# Keep the Portal JWT Fresh for Long Sessions

**Jira**: https://concord-consortium.atlassian.net/browse/AP-139

**Status**: **Closed**

## Overview

A student who keeps an activity open for more than an hour can no longer submit with "I'm Done!", because the Activity Player gets a one-hour portal JWT at launch and never renews it. This change keeps that JWT renewed for as long as the page is open, along with the Firebase token that interactives' object storage signs in with. When renewal becomes impossible, the student sees a readable "relaunch" message instead of "Unexpected error: Signature has expired".

## Requirements

**Token lifecycle**

- R1. The Activity Player keeps the learner's portal JWT in a single owner. Every caller that sends a portal JWT after startup gets the current token from that owner rather than from a copy taken at launch. No code path reads a launch-time copy of the raw portal JWT.
- R2. Before the token goes stale, the owner re-mints it by calling `api/v1/jwt/portal` with `Authorization: Bearer/JWT <current token>`. "Stale" means 80% of the token's lifetime (`exp - iat`) has elapsed, which is 48 minutes for today's one-hour token.
- R3. When a caller asks for the token and it is stale or expired, the owner refreshes it before answering. A background timer is not enough on its own, because timers stall in background tabs and on sleeping laptops. A caller never waits on a refresh indefinitely: the refresh request has a bounded timeout (superagent has none by default), and a timeout is a refresh failure under R7.
- R4. Concurrent callers share one in-flight refresh. N callers arriving while a refresh is pending cause one portal request, and all N get its result.
- R5. Elapsed lifetime is measured from when the Activity Player received the token, using the token's own `exp - iat` as its length. A device clock that disagrees with the portal's clock must not cause early expiry, late expiry, or a refresh loop. The local measure is an estimate: when the portal itself refuses the held token as expired (`Signature has expired`), the token is expired, whatever the local measure says. A refusal of a token that a concurrent refresh has already replaced is retried with the current token instead.
- R6. A refreshed token replaces the current one only when its identity claims match the original's: `uid`, `user_type`, `learner_id`, `offering_id` and `class_info_url`. A mismatch counts as a refresh failure. Other claims (`admin`, `project_admins`) are recomputed by the portal on every mint and may legitimately change.
- R7. When a refresh fails but the current token has not yet expired, callers keep getting the current token, and the next request or timer tick tries the refresh again. A transient network error must not end the session early.

**Failure message**

- R8. When the token has expired and cannot be refreshed, or when the portal refuses a Firebase JWT request because the portal JWT has expired, every caller that needed it fails with one readable message that tells the student to close the tab and relaunch the activity. The message appears:
  - as the "I'm Done!" job failure message (`createJob`), in place of `Unexpected error: Signature has expired` and without the `Unexpected error:` prefix;
  - as the `message` of the `firebaseJWT` error response to an interactive's `getFirebaseJWT` request;
  - as the rejection reason of a plugin's `getFirebaseJwt`.
- R9. An unrecoverable refresh does not replace the activity with a full-page error. Answers keep saving through Firestore's own session, so the student can keep working. The message appears only where a caller actually needed the portal.

**Object storage**

- R12. An interactive that starts after its launch-time report-service Firebase JWT has gone stale gets a current one in `objectStorageConfig.user.jwt`. One re-mint, made through the portal JWT owner (R1), serves every interactive that starts while it is fresh. Every interactive starts, including those that do not use object storage, so the wait is bounded: the re-mint's Firebase JWT request has the same timeout as the refresh in R3. If no current token can be had, the interactive starts with the newest token held, even an expired one, and gets no relaunch message (see the decision below). An interactive that unmounts while its token is pending is never sent `initInteractive`.

**Scope guards**

- R10. Nothing changes for anonymous runs, preview / Teacher Edition, or the teacher / OAuth path.

**Tests**

- R11. Unit tests cover:
  - the timer refresh at 80% of the lifetime;
  - on-demand refresh when the token is stale, and when it is expired;
  - a single shared refresh for concurrent callers (asserting the request count);
  - callers after a refresh using the new token, not the original;
  - a refresh that times out;
  - the portal refusing a token that the local measure still considers fresh;
  - keeping the current token when a refresh fails before expiry;
  - rejecting a refreshed token whose claims differ;
  - skew independence, with a device clock offset from `iat`;
  - on-demand refresh of a locally expired token that the portal still accepts;
  - the readable message at each of the three surfaces in R8, which must no longer contain `Signature has expired`;
  - at the app level: a learner launch creates the token owner and the object-storage token, whose re-mint goes through the owner with the class hash; a failed learner setup stops the owner's timer; teacher and anonymous runs create neither (R10); and an expired session reported to a caller leaves `errorType` unset (R9);
  - R12: a stale object-storage token is re-minted once for concurrent callers and then reused; the interactive receives the new token; the re-mint request has a timeout; a failed re-mint falls back to the newest held token, before and after expiry; no `initInteractive` is sent after unmount.

## Technical Notes

- **Where the token was read.** The launch URL's `token=` is itself a portal JWT with a 180-second life (rigse `ExternalActivity`, `create_portal_token(..., 180)`; also `CreateCollaboration`). `app.tsx` exchanges it once through `fetchPortalJWT` for a one-hour portal JWT (`PortalTokenClaims::STANDARD_TTL = 3600`). Before this change that JWT was copied into `IPortalData.rawPortalJWT` and read by `handleGetFirebaseJWT` (the job executor behind "I'm Done!", and interactives' `getFirebaseJWT`), by the plugin context's `getFirebaseJwtFromPortal`, and once at startup by `getAttachmentsManagerOptions`. Only the learner path keeps a portal JWT.
- **Re-minting is supported by the portal as is.** `GET api/v1/jwt/portal` with `Authorization: Bearer/JWT <portal JWT>` returns 201 and a new JWT whose claims are identical except `iat`/`exp`, with a fresh 3600-second life. No `as_learner` / `offering_id` parameters are needed: `check_for_auth_token` restores the learner from the token's `learner_id`. An expired JWT gets 400 `Signature has expired`. On rigse master, `reject_credential_issuing_callers` refuses only tokens carrying `minted_via_oidc_client_id`, which learner tokens do not; the RIGSE-367/368 token-capability work restricts only scoped tokens, and a learner JWT has no `scope` claim.
- **Relaunch message.** The Jira proposal says "return to the portal", but AP-69 removed "portal" from student-facing text. The message is "Your session has expired. Please close this tab and relaunch the activity.", built from `errorMsg.timeout` and the relaunch instruction in `src/components/error/error-messages.ts`, the shared source the error screen also uses.
- **Clock.** The portal sets `iat` to its own time, so lifetime is measured from receipt on the client (`Date.now()` at receipt plus `exp - iat`) rather than against the device's absolute clock.
- **Why an expired token cannot be rescued.** AP runs on a different origin from the portal and sends no portal cookies, and the launch token lasted only 180 seconds. Once the portal JWT itself has expired, AP has no credential left to re-mint with.
- **How each surface stringifies a rejection.** `iframe-runtime.tsx`'s `getFirebaseJWT` listener reports `e.toString()` and `createJob`'s catch-all reports `String(error)`; both turn `new Error(msg)` into `"Error: msg"`. Each surface therefore recognizes the session-expired error and reports its bare message.
- **Timeout shape.** `superagent.timeout(ms)` fails with an `Error` whose `code` is `ECONNABORTED` and whose response is `undefined`; it carries no portal message, so it is a transient failure under R7.
- **No new exposure from renewal.** A holder of a valid portal JWT could already call `api/v1/jwt/portal` to extend it; AP now uses that existing capability. The token stays in memory only and is not written to storage or logs.
- **Firestore save path.** `signInWithToken` (`src/firebase-db.ts`) signs in once with the custom token, and the Firebase SDK refreshes its ID token hourly with its refresh token, without the portal JWT.

## Out of Scope

- Surviving a page reload. The URL's launch token expired minutes after launch; persisting the portal JWT in browser storage would be a new credential-at-rest decision.
- Recovering after the portal JWT has actually expired (for example, a laptop asleep past `exp`). There is no credential left to renew with.
- Portal changes, including longer token lifetimes.
- Renewing the attachments manager's token-service JWT *(deferred to [LARA-223](https://concord-consortium.atlassian.net/browse/LARA-223))*. It needs an optional token source in `interactive-api-host`'s `IAttachmentsManagerInitOptions`; once that is released, AP passes a source that mints through the portal JWT owner.
- The teacher / OAuth path, which does not keep a portal JWT.
- The idle-warning and session-timeout flow (`IdleDetector`, 20 + 5 minutes), which is unchanged and independent of token expiry.

## Decisions

### Where does the unrecoverable-session message appear?
**Context**: The Jira says "show a clear message" without saying where.
**Options considered**:
- A) As the failure message at the surface that needed the token (job failure, interactive error response, plugin rejection), leaving the page usable.
- B) Also switch the whole app to the existing `auth` error screen.

**Decision**: A. Firestore saves keep working on their own session, so a full-page error would take away a working activity to report that one feature failed. The "I'm Done!" button already renders the job's failure message, which is exactly where the student is looking.

---

### Message wording
**Context**: The Jira proposes "return to the portal and relaunch", but AP-69 removed "portal" from student-facing copy.
**Options considered**:
- A) Follow AP-69: "Your session has expired. Please close this tab and relaunch the activity."
- B) Use the Jira wording verbatim.

**Decision**: A. It is consistent with the existing auth screen, and the Jira's "such as" marks its wording as an example rather than a requirement.

---

### One staleness threshold for both the timer and on-demand refresh
**Context**: The Jira gives 80% for the timer and "expired or close to it" for on-demand refresh.
**Options considered**:
- A) One threshold, 80% of lifetime, for both.
- B) A separate, smaller on-demand margin (for example, the last 5 minutes).

**Decision**: A. One rule is easier to test and reason about. On-demand refresh at 80% costs at most one extra portal request per 48 minutes, and it covers a stalled timer the moment a caller arrives.

---

### Scope: the attachments manager's token-service JWT
**Context**: `getAttachmentsManagerOptions` mints a `token-service` Firebase JWT once at startup and hands it to `AttachmentsManager`, which keeps it for every token-service call. The token service checks `exp`, so attachment reads and writes should fail after an hour, the same bug class.
**Options considered**:
- A) Out of scope, with a follow-up story.
- B) In scope.

**Decision**: A. `interactive-api-host` builds `AttachmentsManager` once behind a module-level promise and has no way to swap the JWT, so a fix needs a new API in that library first, with its own release. The startup call still moves to the token owner (R1), so AP can mint on demand once LARA-223 adds the token source.

---

### Scope: the report-service custom token handed to interactives' object storage
**Context**: `iframe-runtime.tsx` put the launch-time report-service custom token into every interactive's `objectStorageConfig.user.jwt`, and `@concord-consortium/object-storage` signs in with it when the interactive starts. AP mounts only the current page's interactives, so an object-storage interactive (question-interactives' `graph`, `live-graph`, `agent-simulation`) first loaded more than an hour after launch fails to sign in.
**Options considered**:
- A) Out of scope; file a follow-up story, since the Jira names only the portal JWT's three callers.
- B) In scope, as an extra requirement and acceptance criterion.

**Decision**: B, in scope (Doug, 2026-09-30); see R12. The token is cached and shared rather than minted per interactive, so a page of interactives costs at most one portal round trip per stale period.

---

### Bound the refresh with a timeout
**Context**: R3 makes callers wait for a refresh, but superagent 10.3.0 sets no timeout unless `.timeout()` is called, so a stalled portal request would hang "I'm Done!" while the current token was still valid.
**Options considered**:
- A) Require a bounded refresh timeout that falls through to R7.
- B) Leave the request unbounded.

**Decision**: A. The refresh has a 10-second timeout (rather than 30): after a timeout callers get the still-valid current token, so a short bound costs nothing and "I'm Done!" never waits more than 10 seconds on it. The object-storage re-mint (R12) shares the bound, since every interactive's `initInteractive` waits on it and a stalled request held by the shared cache would block every later interactive too.

---

### No relaunch message when object storage cannot get a current token
**Context**: R8's surfaces are all answers to a request AP serves. Object storage signs in from inside the interactive with the token in `initInteractive`, and that message has no field for an error, so AP has nowhere to put the message without a new UI surface.
**Options considered**:
- A) Start the interactive with the newest held token and show nothing.
- B) Add a new AP-level banner for this case.

**Decision**: A (Doug, 2026-10-01, from PR review). The newest held token, not the launch token, so a renewal that succeeded earlier is not thrown away. If the session has truly expired, the student sees the relaunch message at the next R8 surface they reach, such as "I'm Done!".

---

### The portal's refusal is authoritative over the local lifetime measure
**Context**: The local measure can be wrong: the wall clock can change mid-session, and `performance.now()` pauses during system sleep on some platforms. If the measure said "fresh" and the portal disagreed, the caller would get the raw `Signature has expired`.
**Options considered**:
- A) Trust the local measure only.
- B) Treat a portal `Signature has expired` as expiry, whatever the local measure says.

**Decision**: B (R5), and R8 covers a refusal on a Firebase JWT request as well as on a refresh.

---

### Compare identity claims only on refresh
**Context**: `PortalTokenClaims#add_admin_claims` recomputes `admin` and `project_admins` from the user's current roles on every mint, so comparing every claim except `iat`/`exp` would end a session on a mid-session role change.
**Options considered**:
- A) Compare all claims except `iat`/`exp`.
- B) Compare `uid`, `user_type`, `learner_id`, `offering_id`, `class_info_url`.

**Decision**: B (R6), which is what the Jira acceptance criterion names ("same user, learner and class").

---

### No `Unexpected error:` prefix on the job message
**Context**: `createJob`'s catch-all prefixes every error with `Unexpected error:`, so passing the readable text through it unchanged would still read as a crash.
**Options considered**:
- A) Keep the catch-all as is.
- B) Report the session-expired message bare.

**Decision**: B (R8). Other errors keep their prefix.

---

### Inject `mint` rather than import it in the manager
**Options considered**:
- A) Inject it, with `app.tsx` passing a closure over `refreshPortalJWT`.
- B) Import `refreshPortalJWT` inside the manager.

**Decision**: A. The manager tests need no superagent mocking, and `portal-api.ts` does not have to import the manager, which avoids a cycle through `portal-utils.ts`. `fetchPortalJWT` returns the `basePortalUrl` it validated, and `app.tsx` closes over it, since `getBasePortalUrl()` is `string | undefined`.

---

### Remove `IPortalData.rawPortalJWT` rather than keep it updated
**Options considered**:
- A) Remove the field.
- B) Keep it and have the manager write each refreshed token back into portal data.

**Decision**: A. Removing it makes R1 compiler-checked: any reader left behind fails to build. Writing back would keep a second copy that React state and `PortalDataContext` would hold stale anyway.

---

### A tagged `Error` rather than an `Error` subclass
**Context**: `tsconfig.json` targets `es5`, where `instanceof` fails for `Error` subclasses; a `class SessionExpiredError extends Error` failed the manager tests.
**Options considered**:
- A) An `Error` subclass.
- B) A factory returning a plain `Error` tagged by `name`, with an `isSessionExpiredError` predicate.

**Decision**: B.
