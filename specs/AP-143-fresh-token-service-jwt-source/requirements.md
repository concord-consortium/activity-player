# Pass a Fresh Token-Service JWT Source to the Attachments Manager

**Jira**: https://concord-consortium.atlassian.net/browse/AP-143
**Repo**: https://github.com/concord-consortium/activity-player
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **In Development**

## Overview

The Activity Player hands the attachments manager one token-service JWT at startup, and that token expires after an hour, so a student who keeps a page open longer can no longer save or load attachments. This story passes the manager a way to mint a current token instead, using the option LARA-223 adds to `@concord-consortium/interactive-api-host`.

## Project Owner Overview

Students who keep an activity open for more than an hour lose the ability to record audio, upload images, or play back what they saved earlier, because the credential the page got at launch has expired. AP-139 fixed the same problem for "I'm Done!" and Firebase sign-in, but deferred attachments because the shared host library had no way to accept a newer credential. LARA-223 adds that hook to the library.

This story connects Activity Player to the hook, so attachments keep working for logged-in students however long the page stays open. Anonymous runs, previews and Teacher Edition do not use this credential and are unchanged.

## Background

The [Jira story](https://concord-consortium.atlassian.net/browse/AP-143) gives the cause; the code confirms it:

- `getAttachmentsManagerOptions` (`src/utilities/get-attachments-manager-options.ts`) awaits one `getFirebaseJWT(basePortalUrl, rawPortalJWT, { firebase_app: "token-service" })` through `getPortalJWTManager().withToken(...)` and returns it as `tokenServiceFirestoreJWT`. `app.tsx:312` passes the result to `initializeAttachmentsManager`, which builds one `AttachmentsManager` behind a resolve-once promise.
- The manager keeps that JWT for every token-service call. The portal signs it to expire one hour after `iat`, and the token service rejects it after that (both verified in the LARA-223 spec), so attachment requests fail for the rest of the session.
- AP-139 already made the portal JWT itself renewable: `PortalJWTManager.withToken` hands its callback a current portal JWT, refreshing it when stale, and throws `sessionExpiredError()` when the session cannot be renewed. AP-139 moved the startup mint onto `withToken` so this story only has to call it again on demand.
- [LARA-223](https://concord-consortium.atlassian.net/browse/LARA-223) (spec in `../lara/specs/LARA-223-let-the-host-supply-a-fresh-token-service-jwt/`) adds `getTokenServiceFirestoreJWT?: () => Promise<string>` to `IAttachmentsManagerInitOptions`. The manager caches each token the source returns for its `exp - iat` lifetime, counted from when it received the token, less five minutes, and calls the source again once that has passed. It shares one in-flight call among concurrent requests, and reports a rejected call as that request's `response.error` without caching the failure. With only a source, `isAnonymous()` is `false`, so new folders still get the `["user", "context"]` access rule; when a source is given, a static `tokenServiceFirestoreJWT` is ignored (LARA-223 R7). The source's promise must settle, since every waiting and later request shares a pending call (LARA-223 R12). It is released as 0.13.0, with `0.13.0-pre.0` on the `beta` tag first for this story to verify against.
- Only the learner path creates a portal JWT manager (`app.tsx:254`). The teacher / Teacher Edition path and anonymous runs both end with anonymous portal data (`initializeAnonymousDB`), which has no `basePortalUrl`, so `getAttachmentsManagerOptions` passes no token for them today.
- The startup mint is the only thing `getAttachmentsManagerOptions` awaits. If it fails, the `.then` in `app.tsx` never runs, the rejection is unhandled, and every attachment request waits 20 seconds for `getAttachmentsManager()` and then fails with "the host environment did not initialize the attachments manager".

## Requirements

- **R1. Dependency.** `@concord-consortium/interactive-api-host` is bumped from 0.12.0 to the LARA-223 release that adds `getTokenServiceFirestoreJWT`. The story merges on the final 0.13.0, not a pre-release; `0.13.0-pre.0` may be used on the branch for verification.
- **R2. Token source for logged-in learners.** When the portal JWT manager exists and the portal data has a `basePortalUrl`, the options passed to `initializeAttachmentsManager` include `getTokenServiceFirestoreJWT`, a function that mints a token-service Firebase JWT through `getPortalJWTManager().withToken(raw => getFirebaseJWT(basePortalUrl, raw, { firebase_app: "token-service" }))` and resolves to the raw token string.
- **R3. No startup mint.** For logged-in learners, `tokenServiceFirestoreJWT` is no longer passed; the first attachment request mints the first token through the source. The attachments manager is therefore initialized without waiting on the portal, and a portal failure at startup no longer leaves it uninitialized.
- **R4. Current portal JWT and a new token on every mint.** Each call to the source goes through `withToken`, so it uses the portal JWT current at that moment rather than one captured when the options were built, and each call requests a newly minted token from the portal rather than returning one AP cached. LARA-223 R4 times a token from when the manager receives it and does not restart the lifetime of a token it has seen before, so a reused token would go stale immediately.
- **R5. Bounded mint.** A call to the source fails rather than hanging when the portal does not answer: the Firebase JWT request has the same 10-second timeout AP-139 gives other renewals a caller waits on (`kRenewalTimeoutMs`). A portal JWT refresh that `withToken` makes first has its own 10-second bound (AP-139 R3), and `withToken`'s one retry after a concurrent refresh is bounded the same way, so every portal request in a call is bounded and the call settles. The manager shares one in-flight call among concurrent and later attachment requests, so a call that never settled would block attachments for the rest of the session; the timeout is what satisfies LARA-223 R12's requirement that the source's promise settle.
- **R6. Failure reaches the interactive.** When a mint fails (portal error, timeout, or an expired session, which `withToken` reports as `sessionExpiredError()`), the source rejects, and the attachment request that needed the token gets an error response as LARA-223 R6 describes. The next request tries again.
- **R7. Anonymous, preview and teacher runs unchanged.** When there is no portal JWT manager or no `basePortalUrl`, no token source and no static token are passed, and the attachments manager behaves exactly as today (folders use a `readWriteToken`).
- **R8. Other options unchanged.** `tokenServiceEnv` and `writeOptions` are computed exactly as today.
- **R9. Tests.** `get-attachments-manager-options.test.ts` covers:
  - logged-in learner: the options include `getTokenServiceFirestoreJWT` and no `tokenServiceFirestoreJWT`, and building the options makes no portal request;
  - calling the source resolves to the raw token-service JWT;
  - a call before and a call after the portal JWT manager refreshes its token send the launch and the refreshed portal JWT;
  - a rejected Firebase JWT request rejects the source;
  - anonymous: neither `getTokenServiceFirestoreJWT` nor a token is passed;
  - `tokenServiceEnv` and `writeOptions` for both cases, as today.

  `portal-api.test.ts` covers the mint's request: `firebase_app: "token-service"`, the current portal JWT, and the timeout.
- **R10. Verification.** Before merge, a Playwright run on the dev server with a staging learner launch and the pre-release confirms the first acceptance criterion: after the browser clock is moved more than 55 minutes past the first attachment request (when the manager received its first token), the next attachment request triggers a new `firebase_app=token-service` request whose token the token service accepts; after the clock is set back to real time, the request after that makes no new mint and succeeds, reading the attachment with that new token. The clock goes back because the manager signs S3 URLs with the browser clock, and S3 rejects a URL signed 56 minutes in the future, so the attachment itself cannot load while the clock is ahead. The clock is installed before navigation (`page.clock.install()`) and moved with `page.clock.setSystemTime`, which shifts `Date.now()` without firing due timers; `fastForward` or `runFor` would fire the 20-minute idle detector (`kMaxIdleTime`) and replace the page with the idle warning.

## Technical Notes

- Files in play: `src/utilities/get-attachments-manager-options.ts` and its test, `src/components/app.tsx` (the call site, since the function becomes synchronous), `src/portal-api.ts` (a bounded token-service mint, alongside `refreshActivityPlayerFirebaseJWT`), `package.json` and `package-lock.json`.
- `getFirebaseJWT` resolves `[rawToken, decoded]`; the source must resolve the raw string. It rejects with a string (`getErrorMessage`), not an `Error`; LARA-223 accepts any rejection.
- `getFirebaseJWT` already takes `timeoutMs`; `kRenewalTimeoutMs` is module-private in `portal-api.ts`, so the bounded mint belongs next to `refreshActivityPlayerFirebaseJWT` rather than re-declaring the value.
- The token service decides validity; the manager's freshness check (LARA-223 R4, the token's `exp - iat` timed from receipt) is only a refresh hint, so a wrong browser clock does not change when AP's source is called. AP does nothing with the token beyond returning it.
- The portal's `SignedJwt.create_firebase_token` (`rigse/rails/lib/signed_jwt.rb`) sets `iat = now - 30` and `exp = iat + 3600` with no `jti`, so two mints in the same second return the same string. LARA-223 R4 then keeps the first receipt time, which is harmless: both copies have the same claims. A mint made because the cached token went stale is at least 55 minutes newer, so it is always a different string.
- `handleGetAttachmentUrl` wraps a manager failure as `error creating url for attachment: "<name>" [s3: "<rejection>"]`. For an expired session that reads `[s3: "Error: Your session has expired. Please close this tab and relaunch the activity."]`.
- Verified with a throwaway jest test against the real `PortalJWTManager` (injected `now`, mocked `getFirebaseJWT`): a source built as `withToken(raw => getFirebaseJWT(..., { firebase_app: "token-service" }, 10000)).then(([t]) => t)` sends the launch portal JWT on its first call, and after 49 minutes sends the refreshed portal JWT, with one portal refresh and the timeout passed through. That is the R9 "token changes" test shape.
- The existing test mocks `getFirebaseJWT` by spreading `jest.requireActual("../portal-api")`. A call made from inside `portal-api.ts` (such as `refreshActivityPlayerFirebaseJWT` calling `getFirebaseJWT`) binds to the module's own function and bypasses that mock; a throwaway test confirmed the real superagent request ran. So if the bounded mint is a new `portal-api.ts` helper, the options test mocks that helper rather than `getFirebaseJWT`, and the helper's timeout is tested in `portal-api.test.ts`.
- Between `interactive-api-host@v0.12.0` and LARA `master`, the only commits touching `interactive-api-host` are LARA-219 docs, so the bump brings LARA-223's change and nothing else.

## Out of Scope

- Changes to `interactive-api-host` itself, including how `handleGetAttachmentUrl` formats errors (LARA-223 and LARA own it).
- LARA's runtime, which has the same one-hour limit (out of scope in LARA-223 too).
- A relaunch banner or other new UI for attachment failures.
- Surviving a page reload, or recovering after the portal JWT itself has expired (AP-139's limits apply).

## Open Questions

### RESOLVED: Judgment call: pass only the source, or the source plus a startup token?
**Context**: The Jira says only "pass getTokenServiceFirestoreJWT", leaving open whether the startup mint stays as `tokenServiceFirestoreJWT`. Under LARA-223 R7 a static token is ignored when a source is given, because the manager cannot know when it was received.
**Options considered**:
- A) Pass only the source; the first attachment request mints.
- B) Keep the startup mint as `tokenServiceFirestoreJWT` and add the source.

**Decision**: A. B is moot: the manager would ignore the static token, so the startup mint would cost a portal request for nothing while keeping the startup await, whose failure today leaves the manager uninitialized for the whole session. A removes that failure mode and the code that causes it, and a failed first mint is retried on the next request (LARA-223 R6).

### RESOLVED: Judgment call: bound the mint with a timeout?
**Context**: The startup mint today has no timeout. Under LARA-223 R5 a hanging source call is shared by every waiting attachment request.
**Options considered**:
- A) Use AP-139's 10-second renewal timeout.
- B) No timeout, as today.

**Decision**: A. It matches every other renewal a caller waits on (AP-139's "Bound the refresh with a timeout" decision), and the cost of a timeout is one failed request that the next one retries.

### RESOLVED: Judgment call: merge on a pre-release?
**Context**: LARA-223 publishes `0.13.0-pre.0` to `beta` for this story to verify, then 0.13.0.
**Options considered**:
- A) Verify on the pre-release, merge only on 0.13.0.
- B) Merge on the pre-release.

**Decision**: A. AP's `package.json` pins exact versions of this package, and a `beta` pin on master would outlive the verification.

### RESOLVED: Low confidence: how is "more than an hour after launch" verified end to end?
**Context**: The first acceptance criterion is about real elapsed time. Unit tests here cover only AP's side (the source mints through `withToken`); the caching lives in LARA-223. Waiting an hour on staging is slow, and moving the browser clock forward changes what the manager sees as stale but not what the token service accepts.
**Options considered**:
- A) Unit tests only.
- B) A Playwright run on the dev server against a staging learner launch, using a fake browser clock moved more than 55 minutes past the first token's receipt, asserting a second `firebase_app=token-service` request and a successful attachment read after it.
- C) A real one-hour session on staging after merge.

**Decision**: A plus B. The unit tests pin AP's side; B exercises the real manager, portal and token service in minutes. The manager times a token's lifetime with `Date.now()` from receipt, so moving the fake clock makes the cached token stale without waiting. Moving it also makes `PortalJWTManager` see its token as stale and renew it, which the portal accepts since real time has not passed, so the run checks the whole renewal chain. The clock then goes back to real time before the final read, since S3 rejects URLs signed with the advanced clock (R10). The run uses the pre-release (R1) before merge; C adds nothing B does not show except the token service's own expiry check, which LARA-223 already verified.

### RESOLVED: Low confidence: is the wrapped error text acceptable for an expired session?
**Context**: AP-139 R8 gave the relaunch message bare at three surfaces. Through `handleGetAttachmentUrl` it arrives wrapped (see Technical Notes), and AP cannot unwrap it without a LARA change. Interactives show `response.error` in their own way, if at all.
**Options considered**:
- A) Accept the wrapped text; LARA owns the format.
- B) Ask LARA-223 to pass a session-expired rejection through bare.

**Decision**: A. B would change another story's contract for a message that only appears after the portal JWT has expired, and AP-139 accepted the same trade-off for object storage ("No relaunch message when object storage cannot get a current token"): the student sees the bare message at the next AP-139 surface, such as "I'm Done!".

## Self-Review

Roles: Senior Engineer, QA Engineer, Release Engineer, Student.

### Staging run

#### RESOLVED: R10 expected the attachment to load while the clock was ahead
Running R10 against a staging learner launch on 2026-10-05 (local build, yalc-linked `0.13.0-pre.0`) confirmed the renewal: with the clock 56 minutes ahead, the next attachment request refreshed the portal JWT, minted a new token-service JWT, and the token service accepted it. The S3 read then failed (`net::ERR_BLOCKED_BY_ORB`, Chrome hiding S3's error body from the `<audio>` request), because the presigned URL is signed with the advanced browser clock; a real session's clock does not jump, so this is an artifact of the method. With the clock set back to real time, the next request minted nothing, reused the new token, and S3 served the recording (206). Fixed in place: R10 ends with the clock reset and the final read.

### QA Engineer

#### RESOLVED: R10's clock advance would trip the idle detector
R10 said only that the browser clock is "advanced". Playwright's `fastForward` and `runFor` fire due timers, so a 56-minute jump fires `IdleDetector`'s 20-minute `setTimeout` (set up in `app.tsx`) and AP shows the idle warning instead of the activity. A throwaway Playwright run confirmed that `page.clock.install()` followed by `page.clock.setSystemTime(now + 56 min)` moves `Date.now()` by 56 minutes while a pending 20-minute timer stays unfired. Fixed in place: R10 names the method.

---

### Senior Engineer

#### RESOLVED: R5's bound did not account for the portal JWT refresh in front of it
`withToken` can refresh the portal JWT before calling the mint, and that refresh has its own 10-second timeout, so R5's "10-second" bound understated the worst case. Fixed in place: R5 states the composed bound.

