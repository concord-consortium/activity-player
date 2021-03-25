import { getCanonicalHostname, getHostnameWithMaybePort, isOfflineHost, isProduction } from "./host-utils";

describe("isOfflineHost", () => {
  const { location } = window;

  it("determines offline mode via the window host value", () => {
    delete (window as any).location;

    const mockLocation = {host: ""};
    (window as any).location = mockLocation;

    mockLocation.host = "localhost:11000";
    expect(isOfflineHost()).toBe(false);

    mockLocation.host = "activity-player.concord.org";
    expect(isOfflineHost()).toBe(false);

    mockLocation.host = "localhost:11002";
    expect(isOfflineHost()).toBe(true);

    mockLocation.host = "activity-player-offline.concord.org";
    expect(isOfflineHost()).toBe(true);

    (window as any).location = location;
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

describe("isProduction", () => {
  it("determines the production location", () => {
    expect(isProduction({origin: "https://example.com", pathname: "/"})).toBe(false);
    expect(isProduction({origin: "https://localhost:11000", pathname: "/"})).toBe(false);
    expect(isProduction({origin: "https://activity-player.example.com", pathname: "/"})).toBe(false);
    expect(isProduction({origin: "https://activity-player-offline.example.com", pathname: "/"})).toBe(false);

    expect(isProduction({origin: "https://activity-player.concord.org", pathname: ""})).toBe(true);
    expect(isProduction({origin: "https://activity-player-offline.concord.org", pathname: ""})).toBe(true);

    expect(isProduction({origin: "https://activity-player.concord.org", pathname: "/"})).toBe(true);
    expect(isProduction({origin: "https://activity-player-offline.concord.org", pathname: "/"})).toBe(true);

    expect(isProduction({origin: "https://activity-player.concord.org", pathname: "/index.html"})).toBe(true);
    expect(isProduction({origin: "https://activity-player-offline.concord.org", pathname: "/index.html"})).toBe(true);

    expect(isProduction({origin: "https://activity-player.concord.org", pathname: "/version/1.0.0/"}, {allowVersions: true})).toBe(true);
    expect(isProduction({origin: "https://activity-player-offline.concord.org", pathname: "/version/1.0.0/"}, {allowVersions: true})).toBe(true);

    expect(isProduction({origin: "https://activity-player.concord.org", pathname: "/version/1.0.0/"}, {allowVersions: false})).toBe(false);
    expect(isProduction({origin: "https://activity-player-offline.concord.org", pathname: "/version/1.0.0/"}, {allowVersions: false})).toBe(false);

    expect(isProduction({origin: "https://activity-player.concord.org", pathname: "/branch/offline-mode/"})).toBe(true);
    expect(isProduction({origin: "https://activity-player-offline.concord.org", pathname: "/branch/offline-mode/"})).toBe(true);

    expect(isProduction({origin: "https://activity-player.concord.org", pathname: "/foo/"})).toBe(false);
    expect(isProduction({origin: "https://activity-player-offline.concord.org", pathname: "/foo/"})).toBe(false);

    expect(isProduction({origin: "https://activity-player.concord.org", pathname: "/branch/foo/"})).toBe(false);
    expect(isProduction({origin: "https://activity-player-offline.concord.org", pathname: "/branch/foo/"})).toBe(false);
  });
});
