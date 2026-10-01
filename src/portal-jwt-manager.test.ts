import { kSessionExpiredMessage } from "./components/error/error-messages";
import { PortalJWTManager, isSessionExpiredError } from "./portal-jwt-manager";

const H = 3600;
const claims = { uid: 7, user_type: "learner", learner_id: 5, offering_id: 3, class_info_url: "c", domain: "d", user_id: "u", alg: "HS256" } as any;
// iat deliberately far from the injected clock, so any use of absolute time fails every test
const tok = (n: number, iat = 1_000_000, extra = {}) => [`raw${n}`, { ...claims, iat, exp: iat + H, ...extra }] as [string, any];
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

describe("PortalJWTManager", () => {
  let clock = 0;
  const now = () => clock;
  const make = (mint: any) => new PortalJWTManager({ rawPortalJWT: "raw0", portalJWT: tok(0)[1], mint, now });
  let m: PortalJWTManager;
  beforeEach(() => { jest.useFakeTimers(); clock = 5_000_000_000; });
  afterEach(() => { m?.dispose(); jest.useRealTimers(); });

  it("returns the held token while fresh without minting", async () => {
    const mint = jest.fn();
    m = make(mint);
    clock += 47 * 60 * 1000;
    await expect(m.getToken()).resolves.toBe("raw0");
    expect(mint).not.toHaveBeenCalled();
  });

  it("refreshes on its timer at 80% of the lifetime, and later callers get the new token", async () => {
    const mint = jest.fn().mockResolvedValue(tok(1, 2_000_000));
    m = make(mint);
    clock += 48 * 60 * 1000;
    jest.advanceTimersByTime(48 * 60 * 1000);
    await flush();
    expect(mint).toHaveBeenCalledWith("raw0");
    await expect(m.getToken()).resolves.toBe("raw1");
  });

  it("shares one refresh between concurrent stale callers", async () => {
    let resolve!: (v: any) => void;
    const mint = jest.fn(() => new Promise(r => { resolve = r; }));
    m = make(mint);
    clock += 50 * 60 * 1000;
    const pending = [m.getToken(), m.getToken(), m.getToken()];
    expect(mint).toHaveBeenCalledTimes(1);
    resolve(tok(1));
    await expect(Promise.all(pending)).resolves.toEqual(["raw1", "raw1", "raw1"]);
  });

  it("keeps the current token when a refresh fails before expiry", async () => {
    m = make(jest.fn().mockRejectedValue(new Error("Timeout of 10000ms exceeded")));
    clock += 50 * 60 * 1000;
    await expect(m.getToken()).resolves.toBe("raw0");
  });

  it("refreshes on demand when the token is locally expired and the portal still accepts it", async () => {
    const mint = jest.fn().mockResolvedValue(tok(1));
    m = make(mint);
    clock += 61 * 60 * 1000;
    await expect(m.getToken()).resolves.toBe("raw1");
    expect(mint).toHaveBeenCalledTimes(1);
  });

  it("fails with the session-expired message when expired and the refresh is refused", async () => {
    m = make(jest.fn().mockRejectedValue("Signature has expired"));
    clock += 61 * 60 * 1000;
    const e = await m.getToken().catch(x => x);
    expect(isSessionExpiredError(e)).toBe(true);
    expect(e.message).toBe(kSessionExpiredMessage);
  });

  it("rejects a refreshed token whose identity claims differ", async () => {
    m = make(jest.fn().mockResolvedValue(tok(1, 2_000_000, { learner_id: 99 })));
    clock += 50 * 60 * 1000;
    await expect(m.getToken()).resolves.toBe("raw0");
    clock += 11 * 60 * 1000;
    await expect(m.getToken()).rejects.toMatchObject({ name: "SessionExpiredError", message: kSessionExpiredMessage });
  });

  it("treats the portal refusing the token as expired, whatever the local measure says", async () => {
    m = make(jest.fn());
    await expect(m.withToken(() => Promise.reject("Signature has expired"))).rejects.toMatchObject({ message: kSessionExpiredMessage });
    await expect(m.getToken()).rejects.toMatchObject({ message: kSessionExpiredMessage });
  });

  it("retries with the current token when an older token is refused after a refresh", async () => {
    m = make(jest.fn().mockResolvedValue(tok(1)));
    let rejectFirst!: (e: unknown) => void;
    const request = jest.fn((raw: string) => raw === "raw0"
      ? new Promise<string>((_resolve, reject) => { rejectFirst = reject; })
      : Promise.resolve(`ok with ${raw}`));
    clock += 47 * 60 * 1000;
    const pending = m.withToken(request);
    await flush();
    clock += 3 * 60 * 1000;
    await expect(m.getToken()).resolves.toBe("raw1");
    rejectFirst("Signature has expired");
    await expect(pending).resolves.toBe("ok with raw1");
    expect(request.mock.calls.map(c => c[0])).toEqual(["raw0", "raw1"]);
    await expect(m.getToken()).resolves.toBe("raw1");
  });

  it("retries a failed timer refresh after a minute", async () => {
    const mint = jest.fn().mockRejectedValueOnce(new Error("net")).mockResolvedValue(tok(1));
    m = make(mint);
    clock += 48 * 60 * 1000; jest.advanceTimersByTime(48 * 60 * 1000);
    await flush();
    clock += 60 * 1000; jest.advanceTimersByTime(60 * 1000);
    await flush();
    expect(mint).toHaveBeenCalledTimes(2);
    await expect(m.getToken()).resolves.toBe("raw1");
  });
});
