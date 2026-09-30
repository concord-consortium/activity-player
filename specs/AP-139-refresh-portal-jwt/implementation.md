# Implementation Plan: Keep the Portal JWT Fresh for Long Sessions

**Jira**: https://concord-consortium.atlassian.net/browse/AP-139
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **In Development**

## Implementation Plan

### Add the portal JWT manager and the session-expired message

**Summary**: Adds a self-contained owner for the learner's portal JWT, the portal call it refreshes with, and the one student-facing message it fails with. Nothing calls it yet, so this step changes no behavior and can be reviewed on its own.

**Files affected**:
- `src/components/error/error-messages.ts` (new): `errorMsg`, moved from `error.tsx`, plus the relaunch instruction and the session-expired message built from them
- `src/components/error/error.tsx`: imports both from `error-messages.ts` instead of defining `errorMsg` and hardcoding the instruction
- `src/components/error/error.test.tsx`: imports `errorMsg` from `error-messages.ts`
- `src/portal-jwt-manager.ts` (new): `PortalJWTManager`, the module singleton, `sessionExpiredError` / `isSessionExpiredError`
- `src/portal-jwt-manager.test.ts` (new)
- `src/portal-api.ts`: `getPortalJWTWithBearerToken` takes an auth scheme and a timeout; new `refreshPortalJWT`; `fetchPortalJWT` also returns the `basePortalUrl` it validated
- `src/portal-api.test.ts`: `refreshPortalJWT` request shape

**Estimated diff size**: ~330 lines

`src/components/error/error-messages.ts`:

```ts
import { ErrorType } from "../app";

export const errorMsg: Record<ErrorType, string> = {
  auth: "Your session is no longer valid.",
  network: "Your network connection has been lost or interrupted.",
  timeout: "Your session has expired."
};

export const kRelaunchInstruction = "Please close this tab and relaunch the activity.";

export const kSessionExpiredMessage = `${errorMsg.timeout} ${kRelaunchInstruction}`;
```

In `error.tsx`, the `errorMsg` literal goes, `import { errorMsg, kRelaunchInstruction } from "./error-messages";` replaces it, and the auth branch renders `<p className="auth-instruction">{kRelaunchInstruction}</p>`. The `ErrorType` import from `../app` is type-only, as it already is in `error.tsx`, so the non-UI modules that import `error-messages.ts` do not load `app.tsx` at runtime.

`src/portal-jwt-manager.ts`. `mint` is injected so the manager holds no HTTP code and its tests need no request mocking. `now` is injected so tests control elapsed time independently of the token's `iat`.

```ts
import { kSessionExpiredMessage } from "./components/error/error-messages";
import { PortalJWT } from "./portal-types";

const kSessionExpiredErrorName = "SessionExpiredError";

// A tagged Error rather than a subclass: with the es5 target, `instanceof` fails for Error subclasses.
export const sessionExpiredError = () => {
  const error = new Error(kSessionExpiredMessage);
  error.name = kSessionExpiredErrorName;
  return error;
};

export const isSessionExpiredError = (e: unknown): e is Error =>
  e instanceof Error && e.name === kSessionExpiredErrorName;

// The message ruby-jwt's JWT::ExpiredSignature carries, which the portal returns as the 400 body's message.
const isPortalExpiredRejection = (e: unknown) => String(e).includes("Signature has expired");

export const kStaleFraction = 0.8;
const kRetryMs = 60 * 1000;
const kIdentityClaims = ["uid", "user_type", "learner_id", "offering_id", "class_info_url"] as const;

type Mint = (rawPortalJWT: string) => Promise<[string, PortalJWT]>;

interface IPortalJWTManagerOptions {
  rawPortalJWT: string;
  portalJWT: PortalJWT;
  mint: Mint;
  now?: () => number;
}

export class PortalJWTManager {
  private raw: string;
  private decoded: PortalJWT;
  private receivedAt: number;
  private lifetimeMs: number;
  private expiredByPortal = false;
  private inflight: Promise<void> | null = null;
  private timer: number | undefined;
  private mint: Mint;
  private now: () => number;

  constructor({ rawPortalJWT, portalJWT, mint, now = Date.now }: IPortalJWTManagerOptions) {
    this.mint = mint;
    this.now = now;
    this.hold(rawPortalJWT, portalJWT);
  }

  async getToken(): Promise<string> {
    if (this.expiredByPortal) throw sessionExpiredError();
    if (!this.isStale()) return this.raw;
    try {
      await this.refresh();
    } catch (e) {
      if (this.expiredByPortal || this.isExpired()) throw sessionExpiredError();
    }
    return this.raw;
  }

  // Runs a portal request with the current token. The portal refusing that token as expired
  // is authoritative, whatever the local measure says.
  async withToken<T>(request: (rawPortalJWT: string) => Promise<T>): Promise<T> {
    const raw = await this.getToken();
    try {
      return await request(raw);
    } catch (e) {
      if (isPortalExpiredRejection(e)) {
        this.expiredByPortal = true;
        throw sessionExpiredError();
      }
      throw e;
    }
  }

  dispose() {
    window.clearTimeout(this.timer);
  }

  // Lifetime is the token's own exp - iat, counted from receipt, so the device clock's
  // absolute time never enters into it.
  private hold(raw: string, decoded: PortalJWT) {
    this.raw = raw;
    this.decoded = decoded;
    this.receivedAt = this.now();
    this.lifetimeMs = (decoded.exp - decoded.iat) * 1000;
    this.schedule(this.lifetimeMs * kStaleFraction);
  }

  private schedule(delayMs: number) {
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.refresh().catch(() => {
        if (!this.expiredByPortal && !this.isExpired()) this.schedule(kRetryMs);
      });
    }, delayMs);
  }

  private elapsed() { return this.now() - this.receivedAt; }
  private isStale() { return this.elapsed() >= this.lifetimeMs * kStaleFraction; }
  private isExpired() { return this.elapsed() >= this.lifetimeMs; }

  private refresh(): Promise<void> {
    if (!this.inflight) {
      this.inflight = this.mint(this.raw)
        .then(([raw, decoded]) => {
          const mismatch = kIdentityClaims.find(k => decoded[k] !== this.decoded[k]);
          if (mismatch) throw new Error(`Refreshed portal JWT changed ${mismatch}`);
          this.hold(raw, decoded);
        }, e => {
          if (isPortalExpiredRejection(e)) this.expiredByPortal = true;
          throw e;
        })
        .finally(() => { this.inflight = null; });
    }
    return this.inflight;
  }
}

let manager: PortalJWTManager | null = null;

export const initializePortalJWTManager = (options: IPortalJWTManagerOptions) => {
  manager?.dispose();
  manager = new PortalJWTManager(options);
  return manager;
};

export const getPortalJWTManager = () => manager;
```

`src/portal-api.ts`. `getPortalJWTWithBearerToken` gains an options argument, `{ scheme = "Bearer", timeoutMs }: IPortalJWTRequestOptions = {}`, sets `` `${scheme} ${rawToken}` ``, and calls `.timeout(timeoutMs)` when one is given. `fetchPortalJWT` keeps its existing call and returns `{ basePortalUrl, rawPortalJWT, portalJWT }`: `getBasePortalUrl()` is `string | undefined`, and `fetchPortalJWT` is where it has already been checked. New export:

```ts
const kPortalJWTRefreshTimeoutMs = 10 * 1000;

export const refreshPortalJWT = (basePortalUrl: string, rawPortalJWT: string) =>
  getPortalJWTWithBearerToken(basePortalUrl, rawPortalJWT,
    { scheme: "Bearer/JWT", timeoutMs: kPortalJWTRefreshTimeoutMs });
```

Tests (`src/portal-jwt-manager.test.ts`). Fake timers plus an injected clock. Fixture tokens use an `iat` far from the injected `now`, so any use of absolute time fails every test. Each test names the mutation it catches:

- fresh at 47 minutes: returns the held token and `mint` is not called (catches a threshold below 80%);
- timer at 48 minutes: `mint` is called with the original token *before* any `getToken`, and the next `getToken` returns the new token (catches a deleted timer, and a refresh that does not replace the token);
- three concurrent stale callers: `mint` called once, all three get the new token (catches a missing in-flight share);
- refresh rejects with a timeout-shaped `Error` at 50 minutes: returns the original token (catches R7);
- locally expired at 61 minutes but the portal still accepts the token: `mint` called once and the new token returned (catches a manager that gives up on its own clock without asking the portal);
- expired at 61 minutes and `mint` rejects `"Signature has expired"`: rejects with `name` `SessionExpiredError` and `message` `kSessionExpiredMessage`;
- refreshed token with a different `learner_id`: the original is kept before expiry, and the manager fails with the session-expired error after it (catches a missing identity check);
- `withToken` whose request rejects `"Signature has expired"` while locally fresh: rejects with the session-expired error, and so does every later `getToken` (catches R5's portal-authoritative rule);
- a timer refresh that fails once: retried after 60 seconds, `mint` called twice (catches a missing retry).

The suite imports `kSessionExpiredMessage` from `error-messages.ts`, since the manager does not re-export it. All nine tests passed against the code above in a throwaway build of the whole plan.

Test (`src/portal-api.test.ts`), with `jest.mock("superagent", () => ({ get: jest.fn(() => mockRequest) }))` and a chainable `mockRequest: Record<string, jest.Mock>` (`set` and `timeout` return it, and `end` calls back with `{ body: { token } }`). `refreshPortalJWT("https://portal", "abc")` requests `https://portal/api/v1/jwt/portal`, sets `Authorization: Bearer/JWT abc`, calls `timeout(10000)`, and resolves to `[token, decoded]`. The explicit type is needed (TS7022 on the self-referencing literal), and `superagent.get` is read through an ES import because the repo's lint forbids `require()`. The existing `firebaseAppName` tests in that file do not touch superagent, so the file-wide mock does not affect them.

---

### Route every portal JWT caller through the manager

**Summary**: Creates the manager at learner launch and removes the launch-time copy of the raw portal JWT from `IPortalData`, so the compiler finds every reader and each one is moved to the manager (R1).

**Files affected**:
- `src/portal-types.ts`: remove `rawPortalJWT` from `IPortalData` (`portalJWT`, the decoded claims, stays: `report-utils.ts` and `iframe-runtime.tsx` read `class_info_url` from it)
- `src/portal-api.ts`: `fetchPortalData` stops copying `rawPortalJWT` into the returned data (it still uses its argument for the three startup requests)
- `src/components/app.tsx`: learner branch calls `initializePortalJWTManager` right after `fetchPortalJWT`
- `src/portal-utils.ts`: `handleGetFirebaseJWT` uses `getPortalJWTManager()?.withToken(...)`
- `src/lara-plugin/plugins/plugin-context.ts`: `getFirebaseJwtFromPortal` uses the manager
- `src/utilities/get-attachments-manager-options.ts`: uses the manager
- `src/portal-utils.test.ts`, `src/utilities/get-attachments-manager-options.test.ts`: fixtures initialize a manager instead of seeding `rawPortalJWT`
- `src/firebase-db.test.ts` (two fixtures, which fail to compile once the field goes) and `src/firebase-job-executor.test.ts` (one fixture, cast `as any`, so it compiles either way): drop `rawPortalJWT`

**Estimated diff size**: ~110 lines

`app.tsx`, learner branch:

```ts
const { basePortalUrl, rawPortalJWT, portalJWT } = await fetchPortalJWT(bearerToken);
if (portalJWT.user_type === "learner") {
  initializePortalJWTManager({ rawPortalJWT, portalJWT, mint: raw => refreshPortalJWT(basePortalUrl, raw) });
  // ...existing comment and fetchPortalData(rawPortalJWT, portalJWT) unchanged
```

The teacher branch and the anonymous branch create no manager (R10). `configureJobExecutor`'s `getFirebaseJWT` is unchanged; it already goes through `handleGetFirebaseJWT`.

`portal-utils.ts`:

```ts
export const handleGetFirebaseJWT = async (params: IHandleGetFirebaseJWTParams, portalData?: IPortalData) => {
  const portalJWTManager = getPortalJWTManager();
  if (portalData?.basePortalUrl && portalJWTManager) {
    const { learnerKey, basePortalUrl } = portalData;
    const _learnerKey = learnerKey ? { learner_id_or_key: learnerKey } : undefined;
    const [rawFirebaseJWT] = await portalJWTManager.withToken(
      rawPortalJWT => getFirebaseJWT(basePortalUrl, rawPortalJWT, { ...params, ..._learnerKey }));
    return rawFirebaseJWT;
  }
  throw new Error("Error retrieving Firebase JWT!");
};
```

`plugin-context.ts` gets the same guard (`portalData.basePortalUrl && getPortalJWTManager()`) and calls `withToken(raw => getFirebaseJWT(basePortalUrl, raw, { firebase_app: appName }))`. `get-attachments-manager-options.ts` does the same with `{ firebase_app: "token-service" }`, and its anonymous result is unchanged.

Tests. `portal-utils.test.ts` initializes a manager per test with a fixture raw token and `{ iat, exp: iat + 3600 }`, and its `getFirebaseJWT` mock switches on the raw token as it does today. Cases:

- resolves with the manager's current token (the mock resolves only for that token);
- a failing Firebase request rejects with its own message;
- the mock rejecting `"Signature has expired"` rejects with `kSessionExpiredMessage`;
- no portal data means the existing `Error retrieving Firebase JWT!` rejection.

`get-attachments-manager-options.test.ts` keeps its assertions, with a manager in place of `rawPortalJWT`. Each fixture test has to call `initializePortalJWTManager` in `beforeEach` and `dispose` in `afterEach`, because the singleton is module state.

---

### Report the session-expired message at each surface

**Summary**: Makes the three surfaces from R8 report `kSessionExpiredMessage` exactly, rather than stringifying the `Error` (`"Error: ..."`) or prefixing it (`"Unexpected error: ..."`).

**Files affected**:
- `src/firebase-job-executor.ts`: `createJob` catch
- `src/components/activity-page/managed-interactive/iframe-runtime.tsx`: `getFirebaseJWT` listener
- `src/lara-plugin/plugins/plugin-context.ts`: `getFirebaseJwtFromPortal` rejection
- `src/firebase-job-executor.test.ts`, `src/components/activity-page/managed-interactive/iframe-runtime.test.tsx`, `src/lara-plugin/plugins/plugin-context.spec.ts`

**Estimated diff size**: ~70 lines

```ts
// firebase-job-executor.ts, createJob
} catch (error) {
  const message = isSessionExpiredError(error) ? error.message : `Unexpected error: ${String(error)}`;
  return this.makeFailureJob(request, message);
}

// iframe-runtime.tsx, getFirebaseJWT listener
catch(e) {
  errorMessage = isSessionExpiredError(e) ? e.message : e.toString();
}

// plugin-context.ts, getFirebaseJwtFromPortal
.catch(e => reject(isSessionExpiredError(e) ? e.message : e));
```

The plugin rejects with the bare string, matching that function's other rejection (`` `Unable to get Firebase JWT for ${appName}, not logged in.` ``).

Tests. Each one feeds `sessionExpiredError()` into the surface and asserts both the exact `kSessionExpiredMessage` and the absence of `Signature has expired`, `Unexpected error` and `Error:`:

- `firebase-job-executor.test.ts`: reset `config` (the executor's `configure` ignores a second call), configure with `getFirebaseJWT` rejecting `sessionExpiredError()`, then assert `result.message` is `kSessionExpiredMessage` and `fetch` was not called. The existing "returns failure job on network error" case asserts only `status`, so it gains `expect(result.result?.message).toBe("Unexpected error: Error: Network failure")`. Without that, the ternary's other branch is untested.
- `iframe-runtime.test.tsx`: next to the existing "handles errors from getFirebaseJWT()" case, `mockGetFirebaseJWT.mockImplementation(() => Promise.reject(sessionExpiredError()))`, then assert `lastPostData().message`.
- `plugin-context.spec.ts`: a new `describe` that mocks `../../portal-api`'s `getFirebaseJWT` (spreading `jest.requireActual`) to reject `"Signature has expired"`, sets `portalDataMock` to `{ type: "authenticated", basePortalUrl }`, initializes a manager, and asserts `rejects.toBe(kSessionExpiredMessage)` and the `(basePortalUrl, raw, { firebase_app })` call. This goes through the real `withToken`, so it also covers the portal-refusal mapping end to end. The file's existing `#getFirebaseJwt` block stays commented out; it targets LARA's fetch-based API and is not this story's concern.

---

### Give interactives' object storage a current token

**Summary**: R12. The report-service Firebase JWT from launch is held in a small cache that re-mints it through the portal JWT manager once it is stale, and `iframe-runtime` waits for it before posting `initInteractive`. Anonymous runs keep posting synchronously.

**Files affected**:
- `src/firebase-jwt-cache.ts` (new): `FirebaseJWTCache` and its module singleton
- `src/firebase-jwt-cache.test.ts` (new)
- `src/portal-jwt-manager.ts`: export `kStaleFraction`, so both holders share one staleness rule
- `src/portal-api.ts`: export `getActivityPlayerFirebaseJWT`, the existing mint that `fetchPortalData` uses for this token (`firebase_app` plus `class_hash`)
- `src/components/app.tsx`: seed the cache after `fetchPortalData`
- `src/components/activity-page/managed-interactive/iframe-runtime.tsx`: await the token, with a `disposed` guard
- `src/components/activity-page/managed-interactive/iframe-runtime.test.tsx`

**Estimated diff size**: ~200 lines

`src/firebase-jwt-cache.ts`:

```ts
import jwt from "jsonwebtoken";
import { kStaleFraction } from "./portal-jwt-manager";

interface IFirebaseJWTCacheOptions {
  rawFirebaseJWT: string;
  mint: () => Promise<string>;
  now?: () => number;
}

// Holds a Firebase JWT and re-mints it when a caller asks after it has gone stale, sharing one
// mint between concurrent callers. As in PortalJWTManager, lifetime is the token's own
// exp - iat counted from receipt.
export class FirebaseJWTCache {
  private raw: string;
  private receivedAt: number;
  private lifetimeMs: number;
  private inflight: Promise<string> | null = null;
  private mint: () => Promise<string>;
  private now: () => number;

  constructor({ rawFirebaseJWT, mint, now = Date.now }: IFirebaseJWTCacheOptions) {
    this.mint = mint;
    this.now = now;
    this.hold(rawFirebaseJWT);
  }

  async get(): Promise<string> {
    if (this.elapsed() < this.lifetimeMs * kStaleFraction) return this.raw;
    if (!this.inflight) {
      this.inflight = this.mint()
        .then(raw => { this.hold(raw); return raw; })
        .finally(() => { this.inflight = null; });
    }
    try {
      return await this.inflight;
    } catch (e) {
      if (this.elapsed() < this.lifetimeMs) return this.raw;
      throw e;
    }
  }

  private hold(raw: string) {
    const decoded = jwt.decode(raw) as { iat?: number; exp?: number } | null;
    this.raw = raw;
    this.receivedAt = this.now();
    this.lifetimeMs = decoded?.iat && decoded?.exp ? (decoded.exp - decoded.iat) * 1000 : 0;
  }

  private elapsed() { return this.now() - this.receivedAt; }
}

let objectStorageJWT: FirebaseJWTCache | null = null;

export const initializeObjectStorageJWT = (options: IFirebaseJWTCacheOptions) => {
  objectStorageJWT = new FirebaseJWTCache(options);
  return objectStorageJWT;
};

export const getObjectStorageJWT = () => objectStorageJWT;
```

It has no timer: the token is needed only when an interactive starts, so on-demand is enough, and nothing ticks while no interactive is loading. A mint failure keeps the held token until it expires, as R7 does for the portal JWT.

`app.tsx`, learner branch. `initializePortalJWTManager`'s result is kept, and the cache is seeded right after `fetchPortalData`, so its receipt time is the launch token's:

```ts
const portalJWTManager = initializePortalJWTManager({ rawPortalJWT, portalJWT, mint: raw => refreshPortalJWT(basePortalUrl, raw) });
// ...
const portalData = await fetchPortalData(rawPortalJWT, portalJWT);
initializeObjectStorageJWT({
  rawFirebaseJWT: portalData.database.rawFirebaseJWT,
  mint: () => portalJWTManager.withToken(raw => getActivityPlayerFirebaseJWT(basePortalUrl, raw, portalData.contextId))
    .then(([rawFirebaseJWT]) => rawFirebaseJWT)
});
```

`portalData.contextId` is `classInfo.classHash`, the same `class_hash` the launch mint used.

`iframe-runtime.tsx`. `initInteractive` is iframe-phone's connect callback. Its listeners are still registered synchronously, and only the final posts wait:

```ts
useEffect(() => {
  let disposed = false;
  const initInteractive = () => {
    // ...listeners, attachments and objectStorageConfig built as today...
    const postInitInteractive = () => {
      // to support legacy interactives first post the deprecated loadInteractive message as LARA does
      // but only when there is initialInteractiveState (also as LARA does)
      if (initialInteractiveState) {
        phone.post("loadInteractive", initialInteractiveState);
      }
      phone.post("initInteractive", initInteractiveMsg);
    };

    if (objectStorageUser.type === "authenticated") {
      // Object storage signs in with this token when the interactive starts, which can be long
      // after launch, so it gets a current one. Failing that, the launch token is still sent.
      const launchJWT = objectStorageUser.jwt;
      (getObjectStorageJWT()?.get() ?? Promise.resolve(launchJWT))
        .catch(() => launchJWT)
        .then(jwt => {
          if (disposed) return;
          objectStorageUser.jwt = jwt;
          postInitInteractive();
        });
    } else {
      postInitInteractive();
    }
  };
  // ...
  // Cleanup.
  return () => {
    disposed = true;
    // ...existing cleanup
```

`objectStorageUser` is the object `objectStorageConfig.user` already refers to, so setting its `jwt` before posting updates the config that goes out. `disposed` is scoped to the effect run, so a reload (which reruns the effect) also discards a pending post from the previous iframe.

Tests. `src/firebase-jwt-cache.test.ts`, with an injected clock and fixture tokens whose `iat` is far from it:

```ts
import jwt from "jsonwebtoken";
import { FirebaseJWTCache } from "./firebase-jwt-cache";

// iat far from the injected clock, so any use of absolute time fails every test
const token = (name: string) => jwt.sign({ name, iat: 1_000_000, exp: 1_000_000 + 3600 }, "secret");

describe("FirebaseJWTCache", () => {
  let clock = 0;
  const now = () => clock;
  beforeEach(() => { clock = 5_000_000_000; });

  it("returns the held token without minting while fresh", async () => {
    const mint = jest.fn();
    const cache = new FirebaseJWTCache({ rawFirebaseJWT: token("launch"), mint, now });
    clock += 47 * 60 * 1000;
    await expect(cache.get()).resolves.toBe(token("launch"));
    expect(mint).not.toHaveBeenCalled();
  });

  it("re-mints once stale, shares the mint, and holds the new token", async () => {
    const mint = jest.fn().mockResolvedValue(token("fresh"));
    const cache = new FirebaseJWTCache({ rawFirebaseJWT: token("launch"), mint, now });
    clock += 48 * 60 * 1000;
    await expect(Promise.all([cache.get(), cache.get()])).resolves.toEqual([token("fresh"), token("fresh")]);
    expect(mint).toHaveBeenCalledTimes(1);
    clock += 10 * 60 * 1000;
    await expect(cache.get()).resolves.toBe(token("fresh"));
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it("keeps the held token when a mint fails before expiry, and rejects after it", async () => {
    const mint = jest.fn().mockRejectedValue(new Error("net"));
    const cache = new FirebaseJWTCache({ rawFirebaseJWT: token("launch"), mint, now });
    clock += 50 * 60 * 1000;
    await expect(cache.get()).resolves.toBe(token("launch"));
    clock += 11 * 60 * 1000;
    await expect(cache.get()).rejects.toThrow("net");
  });
});
```

`iframe-runtime.test.tsx`, in a new `describe`, rendering with authenticated `portalData` (it needs `offering`, since `isOfferingLocked` reads `offering.locked`) and a cache whose injected clock makes the launch token stale:

- after `jest.runAllTimers()` and flushing microtasks, the last post is `initInteractive` with `objectStorageConfig.user.jwt` equal to the minted token;
- unmounting while the mint is pending, then resolving it, posts no `initInteractive`.

The existing `iframe-runtime` tests use anonymous portal data, so their synchronous `lastPost()` assertions still hold.

---

### Cover the launch paths at the app level

**Summary**: R9 and R10 as tests, driving `App.componentDidMount` through each launch branch with its I/O mocked.

**Files affected**:
- `src/components/app-auth.test.tsx` (new)

**Estimated diff size**: ~150 lines

The file is separate from `app.test.tsx`, whose shallow renders rely on the unmocked anonymous path. It mocks `getBearerToken`, `fetchPortalJWT` / `fetchPortalData` / `getFirebaseJWT` (spreading `jest.requireActual`), `initializeDB` / `initializeAnonymousDB` / `signInWithToken` / `getApRun`, `getActivityDefinition` (a sample activity), `getLoggingTeacherUsername`, and the job executor's `configure`, which it captures. `initializePortalJWTManager` and `initializeObjectStorageJWT` are wrapped so the calls are recorded and the real singletons are still created. `mountApp` shallow-renders `App` and yields to the event loop until `componentDidMount` settles.

- learner launch: both initializers called (with the launch portal JWT and the launch Firebase JWT), and `errorType` is `null`;
- teacher launch: `fetchPortalJWT` called, neither initializer called, and `errorType` is `null`;
- anonymous run: the job executor configured, and neither initializer called;
- learner launch, then `getFirebaseJWT` rejecting `"Signature has expired"`: the captured executor's `getFirebaseJWT` rejects with `kSessionExpiredMessage`, and `errorType` is still `null` afterward.

The `errorType` checks on the learner and teacher launches are what make the rest trustworthy. With thin mocks, both paths ended in the `auth` error for unrelated reasons (a missing `offering`, a missing portal domain), and the initializer assertions still passed.

## Open Questions

<!-- Implementation-focused questions only. Requirements questions go in requirements.md. -->

### RESOLVED: Judgment call: Inject `mint` rather than import it in the manager
**Options considered**:
- A) Inject it, with `app.tsx` passing `refreshPortalJWT`.
- B) Import `refreshPortalJWT` inside the manager.

**Decision**: A. The manager tests need no superagent mocking, and `portal-api.ts` does not have to import the manager, which avoids a cycle through `portal-utils.ts`.

### RESOLVED: Judgment call: Remove `IPortalData.rawPortalJWT` rather than keep it updated
**Options considered**:
- A) Remove the field.
- B) Keep it and have the manager write each refreshed token back into portal data.

**Decision**: A. Removing it makes R1 compiler-checked: any reader left behind fails to build. Writing back would keep a second copy that React state (`this.state.portalData`) and `PortalDataContext` would hold stale anyway.

### RESOLVED: Judgment call: Refresh timeout of 10 seconds
**Options considered**:
- A) 10 seconds.
- B) 30 seconds.

**Decision**: A. A slow refresh only matters for callers waiting on a stale token. After a timeout they get the still-valid current token (R7), so a short bound costs nothing, and "I'm Done!" never waits more than 10 seconds on it.

## Self-Review

Roles: Senior Engineer, commit reviewer, test runner, operator. The whole plan was built in a throwaway worktree, and each item below is a defect that build surfaced. All were fixed in place. The final build, all five steps included, type-checked with no errors in `src` (the 16 `node_modules` declaration errors are present on master too), passed `eslint src`, and passed the full Jest suite (104 suites, 608 passed, 9 skipped). Each new test was checked against a mutation of the line it guards, and each mutation failed it. The mutations: each surface's `isSessionExpiredError` branch; the manager's portal-refusal mapping and its refresh-when-expired path; the cache's staleness check and its expiry fallback; `iframe-runtime`'s token assignment and its `disposed` guard; creating the manager on the teacher path; dropping the object-storage seed; and switching the app to the `auth` screen when a caller's session expires.

### Senior Engineer

#### RESOLVED: `refreshPortalJWT` did not compile
It passed `getBasePortalUrl()`, typed `string | undefined`, where `getPortalJWTWithBearerToken` needs a `string` (TS2345). `fetchPortalJWT` now returns the `basePortalUrl` it has already validated, and `app.tsx` closes over it in `mint`.

#### RESOLVED: An `Error` subclass fails `instanceof` under the es5 target
The first draft had `class SessionExpiredError extends Error`. `tsconfig.json` targets `es5`, and in the throwaway run `instanceof SessionExpiredError` was false for a thrown instance, failing three manager tests. The plan now uses a factory that returns a plain `Error` tagged by `name`, and a predicate that checks it.

#### RESOLVED: `ReturnType<typeof setTimeout>` does not type-check here
With both DOM and Node typings loaded, `clearTimeout(this.timer)` failed overload resolution (TS2769). The manager uses `window.setTimeout` with a `number | undefined` field, as `request-tracker.ts` and `iframe-runtime.tsx` do.

### Commit reviewer

#### RESOLVED: The second step's file list missed a fixture that stops compiling
`src/firebase-db.test.ts` seeds `rawPortalJWT` in two typed `IPortalData` literals, and removing the field is a TS2353 there. It is now listed. The steps build in order: step 1 adds only new modules and a backward-compatible `portal-api.ts` signature, and step 2 does not use step 3's `isSessionExpiredError`.

### Test runner

#### RESOLVED: The catch-all's prefix was never asserted
The plan relied on an existing assertion of the `Unexpected error:` prefix that does not exist: "returns failure job on network error" checks only `status`. Without a new assertion, a change that dropped the prefix for all errors would still pass. The plan now adds that assertion.

#### RESOLVED: The superagent mock needed a type and an ES import
The untyped self-referencing mock literal is TS7022, and reading the mocked module through `require()` breaks the repo's `@typescript-eslint/no-require-imports`. The test description now includes both.

