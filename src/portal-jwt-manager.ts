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

  // The portal refusing the token as expired is authoritative, whatever the local measure says.
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

  // Lifetime is exp - iat counted from receipt, so the device's absolute clock never matters.
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
