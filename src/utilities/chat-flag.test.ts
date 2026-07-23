import { resolveChatEnabled } from "./chat-flag";

// Drive the real url-query parsing by setting window.location.search (no mocks) so the test verifies
// end-to-end that a URL maps to the right on/off state — and that nothing persists.
const setSearch = (search: string) => window.history.replaceState(null, "", search || "/");

describe("resolveChatEnabled", () => {
  afterEach(() => setSearch("/"));

  it("is off when ?chat is absent", () => {
    setSearch("/");
    expect(resolveChatEnabled()).toBe(false);
  });

  it("is on for ?chat=true", () => {
    setSearch("?chat=true");
    expect(resolveChatEnabled()).toBe(true);
  });

  it("is on for a bare ?chat", () => {
    setSearch("?chat");
    expect(resolveChatEnabled()).toBe(true);
  });

  it("is off for ?chat=false", () => {
    setSearch("?chat=false");
    expect(resolveChatEnabled()).toBe(false);
  });

  it("does not persist — off again as soon as the param is gone", () => {
    setSearch("?chat=true");
    expect(resolveChatEnabled()).toBe(true);
    setSearch("/");
    expect(resolveChatEnabled()).toBe(false);
  });
});
