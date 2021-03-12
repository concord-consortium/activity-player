import { getCanonicalHostname, getHostnameWithMaybePort, isOfflineHost, isProductionOrigin } from "./host-utils";

describe("isOfflineHost", () => {
  it("determines offline mode via the window host value", () => {
    expect(isOfflineHost("localhost:11000")).toBe(false);
    expect(isOfflineHost("activity-player.concord.org")).toBe(false);
    expect(isOfflineHost("localhost:11002")).toBe(true);
    expect(isOfflineHost("activity-player-offline.concord.org")).toBe(true);
  });
});

describe("getCananoicalHostname", () => {
  const { location } = window;
  it("returns the canonical hostname", () => {
    delete (window as any).location;

    const mockLocation = {hostname: ""};
    (window as any).location = mockLocation;

    mockLocation.hostname = "www.example.com";
    expect(getCanonicalHostname()).toBe("www.example.com");

    mockLocation.hostname = "activity-player-offline.concord.org";
    expect(getCanonicalHostname()).toBe("activity-player.concord.org");

    mockLocation.hostname = "activity-player.concord.org";
    expect(getCanonicalHostname()).toBe("activity-player.concord.org");

    (window as any).location = location;
  });
});

describe("getHostnameWithMaybePort", () => {
  const { location } = window;
  it("returns the hostname with port if not a standard port", () => {
    delete (window as any).location;

    const mockLocation = {host: ""};
    (window as any).location = mockLocation;

    mockLocation.host = "www.example.com";
    expect(getHostnameWithMaybePort()).toBe("www.example.com");

    mockLocation.host = "www.example.com:8080";
    expect(getHostnameWithMaybePort()).toBe("www.example.com:8080");

    (window as any).location = location;
  });
});

describe("isProductionOrigin", () => {
  it("determines the production origin", () => {
    expect(isProductionOrigin("https://example.com")).toBe(false);
    expect(isProductionOrigin("https://localhost:11000")).toBe(false);
    expect(isProductionOrigin("https://activity-player.example.com")).toBe(false);
    expect(isProductionOrigin("https://activity-player-offline.example.com")).toBe(false);
    expect(isProductionOrigin("https://activity-player.concord.org")).toBe(true);
    expect(isProductionOrigin("https://activity-player-offline.concord.org")).toBe(true);
  });
});
