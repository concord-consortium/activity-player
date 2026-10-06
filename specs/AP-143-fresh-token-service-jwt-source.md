# Pass a Fresh Token-Service JWT Source to the Attachments Manager

**Jira**: https://concord-consortium.atlassian.net/browse/AP-143

**Status**: **Closed**

## Overview

The Activity Player handed the attachments manager one token-service JWT at startup, and that token expires after an hour, so a student who kept a page open longer could no longer save or load attachments. This change passes the manager a way to mint a current token instead, using the `getTokenServiceFirestoreJWT` option LARA-223 added to `@concord-consortium/interactive-api-host` in 0.13.0. Anonymous runs, previews and Teacher Edition do not use this credential and are unchanged.

## Requirements

- **R1. Dependency.** `@concord-consortium/interactive-api-host` is bumped from 0.12.0 to the LARA-223 release that adds `getTokenServiceFirestoreJWT`. The story merges on the final 0.13.0, not a pre-release; `0.13.0-pre.0` may be used on the branch for verification. *(Pinned to `0.13.0` after a tarball comparison showed it differs from the verified `0.13.0-pre.0` only in `package.json`'s `version`.)*
- **R2. Token source for logged-in learners.** When the portal JWT manager exists and the portal data has a `basePortalUrl`, the options passed to `initializeAttachmentsManager` include `getTokenServiceFirestoreJWT`, a function that mints a token-service Firebase JWT through the manager's `withToken(raw => refreshTokenServiceJWT(basePortalUrl, raw))` and resolves to the raw token string.
- **R3. No startup mint.** For logged-in learners, `tokenServiceFirestoreJWT` is no longer passed; the first attachment request mints the first token through the source. The attachments manager is therefore initialized without waiting on the portal, and a portal failure at startup no longer leaves it uninitialized.
- **R4. Current portal JWT and a new token on every mint.** Each call to the source goes through `withToken`, so it uses the portal JWT current at that moment rather than one captured when the options were built, and each call requests a newly minted token from the portal rather than returning one AP cached. LARA-223 R4 times a token from when the manager receives it and does not restart the lifetime of a token it has seen before, so a reused token would go stale immediately.
- **R5. Bounded mint.** A call to the source fails rather than hanging when the portal does not answer: the Firebase JWT request has the same 10-second timeout AP-139 gives other renewals a caller waits on (`kRenewalTimeoutMs`). A portal JWT refresh that `withToken` makes first has its own 10-second bound (AP-139 R3), and `withToken`'s one retry after a concurrent refresh is bounded the same way, so every portal request in a call is bounded and the call settles. The manager shares one in-flight call among concurrent and later attachment requests, so a call that never settled would block attachments for the rest of the session; the timeout is what satisfies LARA-223 R12's requirement that the source's promise settle.
- **R6. Failure reaches the interactive.** When a mint fails (portal error, timeout, or an expired session, which `withToken` reports as `sessionExpiredError()`), the source rejects, and the attachment request that needed the token gets an error response as LARA-223 R6 describes. The next request tries again.
- **R7. Anonymous, preview and teacher runs unchanged.** When there is no portal JWT manager or no `basePortalUrl`, no token source and no static token are passed, and the attachments manager behaves exactly as before (folders use a `readWriteToken`).
- **R8. Other options unchanged.** `tokenServiceEnv` and `writeOptions` are computed exactly as before.
- **R9. Tests.** `get-attachments-manager-options.test.ts` covers:
  - logged-in learner: the options include `getTokenServiceFirestoreJWT` and no `tokenServiceFirestoreJWT`, and building the options makes no portal request;
  - calling the source resolves to the raw token-service JWT;
  - a call before and a call after the portal JWT manager refreshes its token send the launch and the refreshed portal JWT;
  - a rejected Firebase JWT request rejects the source;
  - anonymous: neither `getTokenServiceFirestoreJWT` nor a token is passed;
  - `tokenServiceEnv` and `writeOptions` for both cases.

  `portal-api.test.ts` covers the mint's request: `firebase_app: "token-service"`, the current portal JWT, and the timeout.
- **R10. Verification.** Before merge, a Playwright run on the dev server with a staging learner launch and the pre-release confirms the first acceptance criterion: after the browser clock is moved more than 55 minutes past the first attachment request, the next attachment request triggers a new `firebase_app=token-service` request whose token the token service accepts; after the clock is set back to real time, the request after that makes no new mint and succeeds, reading the attachment with that new token. The clock goes back because the manager signs S3 URLs with the browser clock, and S3 rejects a URL signed 56 minutes in the future. The clock is installed before navigation (`page.clock.install()`) and moved with `page.clock.setSystemTime`, which shifts `Date.now()` without firing due timers; `fastForward` or `runFor` would fire the 20-minute idle detector (`kMaxIdleTime`) and replace the page with the idle warning. *(Passed on 2026-10-06 against the npm `0.13.0-pre.0`; see Technical Notes.)*

## Technical Notes

- The change: `refreshTokenServiceJWT` in `src/portal-api.ts` (beside `refreshActivityPlayerFirebaseJWT`, sharing the module-private `kRenewalTimeoutMs`) mints with the timeout; `getAttachmentsManagerOptions` is now synchronous and returns the source; `app.tsx` passes its result straight to `initializeAttachmentsManager`.
- How the 0.13.0 manager uses the source: it caches each token for its `exp - iat` lifetime, counted from receipt, less five minutes; it shares one in-flight call among concurrent requests; a rejected call becomes that request's `response.error` and is not cached; with only a source, `isAnonymous()` is `false`, so new folders still get the `["user", "context"]` access rule; a static `tokenServiceFirestoreJWT` is ignored when a source is given.
- `getFirebaseJWT` resolves `[rawToken, decoded]`, so the source maps to the raw string. It rejects with a string (`getErrorMessage`), not an `Error`; the manager accepts any rejection.
- The token service decides validity; the manager's freshness check is only a refresh hint, so a wrong browser clock does not change when AP's source is called.
- The portal's `SignedJwt.create_firebase_token` sets `iat = now - 30` and `exp = iat + 3600` with no `jti`, so two mints in the same second return the same string. The manager then keeps the first receipt time, which is harmless; a mint made because the cached token went stale is always a different string.
- `handleGetAttachmentUrl` wraps a manager failure as `error creating url for attachment: "<name>" [s3: "<rejection>"]`, so an expired session reaches the interactive as `[s3: "Error: Your session has expired. Please close this tab and relaunch the activity."]`.
- Testing: a mock of `getFirebaseJWT` made by spreading `jest.requireActual("../portal-api")` does not reach calls made inside `portal-api.ts`, so the options test mocks `refreshTokenServiceJWT`, and the request (query, header, timeout) is asserted in `portal-api.test.ts` where the superagent mock sees it. `toStrictEqual` is used so a dropped `tokenServiceFirestoreJWT` key is told apart from one passed as `undefined`.
- R10 method: run AP on port 8081, launch the staging learner run of an activity with an audio-enabled open response (the only question-interactive that uses attachments), and change the AP tab's host to `http://localhost:8081/` within the launch token's 180-second life (a Playwright `route` does not catch the portal's HTTP redirect). Switching pages remounts the interactive and requests the attachment URL again; reloading would start a new launch with an expired launch token. An existing recording is enough, since every check is a read. While the clock is ahead, S3 rejects the read (`net::ERR_BLOCKED_BY_ORB`), which is expected.
- R10 result (2026-10-06, `8e67401` on the dev server, `0.13.0-pre.0` from npm): the first read minted the first token-service JWT; after the 56-minute jump the next read refreshed the portal JWT, minted with the refreshed portal JWT, and the token service accepted the new token; after the reset the next read made no mint, sent the same token on `credentials`, and S3 served the recording (206).
- Release check for the final pin: `npm pack` the verified pre-release and the final release and `diff -r` the extracted packages; only `package.json` may differ, since the bundle does not embed its version. `0.13.0` compared clean against `0.13.0-pre.0`.

## Out of Scope

- Changes to `interactive-api-host` itself, including how `handleGetAttachmentUrl` formats errors (LARA-223 and LARA own it).
- LARA's runtime, which has the same one-hour limit (out of scope in LARA-223 too).
- A relaunch banner or other new UI for attachment failures.
- Surviving a page reload, or recovering after the portal JWT itself has expired (AP-139's limits apply).

## Decisions

### Pass only the source, or the source plus a startup token?
**Context**: The Jira says only "pass getTokenServiceFirestoreJWT", leaving open whether the startup mint stays as `tokenServiceFirestoreJWT`. The manager ignores a static token when a source is given, because it cannot know when the static token was received.
**Options considered**:
- A) Pass only the source; the first attachment request mints.
- B) Keep the startup mint as `tokenServiceFirestoreJWT` and add the source.

**Decision**: A. B would cost a portal request for a token the manager ignores, while keeping the startup await whose failure left the manager uninitialized for the whole session. A removes that failure mode, and a failed first mint is retried on the next request.

---

### Bound the mint with a timeout?
**Context**: The startup mint had no timeout, and a hanging source call is shared by every waiting attachment request.
**Options considered**:
- A) Use AP-139's 10-second renewal timeout.
- B) No timeout.

**Decision**: A. It matches every other renewal a caller waits on, and the cost of a timeout is one failed request that the next one retries.

---

### Merge on a pre-release?
**Context**: LARA-223 published `0.13.0-pre.0` to `beta` for this story to verify, then 0.13.0.
**Options considered**:
- A) Verify on the pre-release, merge only on 0.13.0.
- B) Merge on the pre-release.

**Decision**: A. AP pins exact versions of this package, and a `beta` pin on master would outlive the verification.

---

### How is "more than an hour after launch" verified end to end?
**Context**: The first acceptance criterion is about real elapsed time. Unit tests cover only AP's side; the caching lives in the host package. Waiting an hour on staging is slow.
**Options considered**:
- A) Unit tests only.
- B) A Playwright run on the dev server against a staging learner launch, with a fake browser clock moved more than 55 minutes past the first token's receipt.
- C) A real one-hour session on staging after merge.

**Decision**: A plus B. B exercises the real manager, portal and token service in minutes: moving the fake clock makes both the cached token-service JWT and the portal JWT stale, so the run checks the whole renewal chain. C adds only the token service's own expiry check, which LARA-223 verified.

---

### Is the wrapped error text acceptable for an expired session?
**Context**: AP-139 shows the relaunch message bare at its surfaces, but through `handleGetAttachmentUrl` it arrives wrapped, and AP cannot unwrap it without a LARA change.
**Options considered**:
- A) Accept the wrapped text; LARA owns the format.
- B) Ask LARA-223 to pass a session-expired rejection through bare.

**Decision**: A. B would change another story's contract for a message that only appears after the portal JWT has expired, the same trade-off AP-139 accepted for object storage; the student sees the bare message at the next AP-139 surface, such as "I'm Done!".

---

### R10 ends with the clock set back before the final read
**Context**: The first staging run showed that with the clock 56 minutes ahead the renewal works, but the S3 read fails, because the manager signs the URL with the browser clock.
**Options considered**:
- A) Expect the read to succeed while the clock is ahead.
- B) Check the renewal while the clock is ahead, then reset the clock and check the read.

**Decision**: B. The failed read is an artifact of the method: a real session's clock does not jump.

---

### Move the clock with `setSystemTime`
**Context**: Playwright's `fastForward` and `runFor` fire due timers, so a 56-minute jump fires the 20-minute idle detector and AP shows the idle warning.
**Options considered**:
- A) `fastForward` or `runFor`.
- B) `page.clock.install()` before navigation, then `setSystemTime`.

**Decision**: B. A throwaway Playwright run confirmed it shifts `Date.now()` while a pending 20-minute timer stays unfired.

---

### Re-run R10 on the published package
**Context**: The first R10 pass used a yalc build made before LARA `2701046a`, which changed how the manager keeps stale times and resets a pending call: exactly the code R10 exercises.
**Options considered**:
- A) Accept the yalc-build pass.
- B) Re-run R10 on the npm `0.13.0-pre.0`.

**Decision**: B. A pass on a build no one ships does not verify the release. The re-run passed on 2026-10-06.

---

### Checking the final 0.13.0 before pinning it
**Context**: 0.13.0 is built from LARA `master` after the merge, and the bundle includes `interactive-api-shared` and dependencies from `lara-typescript`'s lock file, so anything landing on `master` first ships in it unverified.
**Options considered**:
- A) Compare the published `0.13.0-pre.0` and `0.13.0` with `npm pack` and `diff -r`; re-run R10 only if more than `package.json` differs.
- B) A git diff of `lara-typescript` between the two tags.
- C) Always re-run R10 on 0.13.0.
- D) No check.

**Decision**: A. It checks the artifact itself, so it also catches lock-file or build-environment changes a git path filter would miss, and it costs an R10 re-run only when something changed. LARA-224 merged first, and the comparison was still clean.

---

### A `portal-api.ts` helper, or call `getFirebaseJWT` directly?
**Options considered**:
- A) `refreshTokenServiceJWT` in `portal-api.ts`, beside `refreshActivityPlayerFirebaseJWT`.
- B) Call `getFirebaseJWT` from the options file with an exported timeout constant.

**Decision**: A. `kRenewalTimeoutMs` stays a single private value shared by every renewal, the mint matches the existing `refresh*` naming, and the timeout is testable where the superagent mock lives.

---

### Make `getAttachmentsManagerOptions` synchronous?
**Options considered**:
- A) Synchronous, returning the options directly.
- B) Keep it `async` with nothing awaited.

**Decision**: A. With the startup mint gone it awaits nothing, and an `async` signature would keep the `.then` in `app.tsx` for no reason. It has one caller.

---

### Commit the pre-release pin, or wait for 0.13.0?
**Options considered**:
- A) Commit `0.13.0-pre.0`, verify, then move the pin to `0.13.0` before merge.
- B) Develop on the yalc link only and commit the bump once 0.13.0 is out.

**Decision**: A. The branch then builds in CI and on any checkout with `npm ci`, and the final pin is its own commit before merge.

---

### Which staging activity exercises attachments for R10?
**Context**: The verification needs a staging activity, assigned to a test learner, whose interactive reads and writes attachments.
**Options considered**:
- A) An existing staging activity with such an interactive.
- B) Author a one-page activity on staging for this check.

**Decision**: A, falling back to B. Of the question-interactives, only `open-response` uses attachments, when `audioEnabled` is authored. Recording needs a microphone (Chromium's `--use-fake-ui-for-media-stream` and `--use-fake-device-for-media-stream` supply one), but reading an existing recording does not.

---

### Delete the startup mint's leftover test default
**Context**: `app-auth.test.tsx` set a `beforeEach` default `mockGetFirebaseJWT.mockResolvedValue(["token-service-jwt"])` that only the startup mint used.
**Options considered**:
- A) Delete it with the change.
- B) Leave it.

**Decision**: A. With the change applied, deleting it left all six tests passing; the one test that uses the mock sets its own rejection.
