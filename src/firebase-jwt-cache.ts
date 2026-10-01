import jwt from "jsonwebtoken";
import { kStaleFraction } from "./portal-jwt-manager";

interface IFirebaseJWTCacheOptions {
  rawFirebaseJWT: string;
  mint: () => Promise<string>;
  now?: () => number;
}

// Holds a Firebase JWT and re-mints it when a caller asks after it has gone stale, sharing one
// mint between concurrent callers. As in PortalJWTManager, lifetime is the token's own
// exp - iat counted from receipt. A failed mint answers with the held token, the newest there is,
// even once it has expired: its consumer has no way to report the failure.
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
    return this.inflight.catch(() => this.raw);
  }

  private hold(raw: string) {
    const decoded = jwt.decode(raw) as { iat?: number; exp?: number } | null;
    this.raw = raw;
    this.receivedAt = this.now();
    // A token without iat and exp is treated as already stale, so every get() re-mints.
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
