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
