import { resolveChatEnabled, kChatEnabledStorageKey } from "./chat-flag";

jest.mock("./url-query", () => ({
  queryValue: jest.fn(),
  queryValueBoolean: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const urlQuery = require("./url-query");
const mockQueryValue = urlQuery.queryValue as jest.Mock;
const mockQueryValueBoolean = urlQuery.queryValueBoolean as jest.Mock;

// Model the real url-query semantics for the `chat` param:
//   absent      → queryValue undefined, queryValueBoolean false
//   ?chat=true  → queryValue "true",    queryValueBoolean true
//   ?chat (bare)→ queryValue undefined,  queryValueBoolean true
//   ?chat=false → queryValue "false",   queryValueBoolean false
const setChatParam = (state: "absent" | "true" | "bare" | "false") => {
  switch (state) {
    case "absent": mockQueryValue.mockReturnValue(undefined); mockQueryValueBoolean.mockReturnValue(false); break;
    case "true":   mockQueryValue.mockReturnValue("true");    mockQueryValueBoolean.mockReturnValue(true);  break;
    case "bare":   mockQueryValue.mockReturnValue(undefined); mockQueryValueBoolean.mockReturnValue(true);  break;
    case "false":  mockQueryValue.mockReturnValue("false");   mockQueryValueBoolean.mockReturnValue(false); break;
  }
};

describe("resolveChatEnabled", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockQueryValue.mockReset();
    mockQueryValueBoolean.mockReset();
  });

  it("defaults to off when the param is absent and nothing is stored", () => {
    setChatParam("absent");
    expect(resolveChatEnabled()).toBe(false);
  });

  it("falls back to localStorage when the param is absent", () => {
    window.localStorage.setItem(kChatEnabledStorageKey, "true");
    setChatParam("absent");
    expect(resolveChatEnabled()).toBe(true);
  });

  it("enables and persists on ?chat=true", () => {
    setChatParam("true");
    expect(resolveChatEnabled()).toBe(true);
    expect(window.localStorage.getItem(kChatEnabledStorageKey)).toBe("true");
  });

  it("enables on a bare ?chat", () => {
    setChatParam("bare");
    expect(resolveChatEnabled()).toBe(true);
    expect(window.localStorage.getItem(kChatEnabledStorageKey)).toBe("true");
  });

  it("disables and clears storage on ?chat=false", () => {
    window.localStorage.setItem(kChatEnabledStorageKey, "true");
    setChatParam("false");
    expect(resolveChatEnabled()).toBe(false);
    expect(window.localStorage.getItem(kChatEnabledStorageKey)).toBeNull();
  });

  it("query param overrides a stored value", () => {
    window.localStorage.setItem(kChatEnabledStorageKey, "true");
    setChatParam("false");
    expect(resolveChatEnabled()).toBe(false);
  });
});
