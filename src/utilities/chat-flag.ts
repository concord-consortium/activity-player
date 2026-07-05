// `?chat` flag resolution.
//
// Resolves chat *visibility* (the render mode is chosen later by layout type). Resolution order:
//   query param  →  localStorage  →  default off
// `?chat=true` enables and persists; `?chat=false` disables and clears the persisted value.
//
// `queryValueBoolean("chat")` returns false for BOTH an explicit `?chat=false` and a
// missing param, so it cannot drive the precedence alone. We combine the two helpers:
//   - `queryValue("chat") === "false"`  detects the explicit disable (`?chat=false`)
//   - `queryValueBoolean("chat")`       is true for a bare `?chat` and `?chat=true`, false otherwise
// so all three states are distinguished: `=false` (disable) / present-true / absent (localStorage).
import { queryValue, queryValueBoolean } from "./url-query";

export const kChatEnabledStorageKey = "ap:chat-enabled";

const readStoredFlag = (): boolean => {
  try {
    return window.localStorage.getItem(kChatEnabledStorageKey) === "true";
  } catch {
    // localStorage can throw (private mode / disabled cookies) — treat as "not set".
    return false;
  }
};

const writeStoredFlag = (enabled: boolean): void => {
  try {
    if (enabled) {
      window.localStorage.setItem(kChatEnabledStorageKey, "true");
    } else {
      window.localStorage.removeItem(kChatEnabledStorageKey);
    }
  } catch {
    // ignore storage failures — the flag still applies for this page load via the query param.
  }
};

export const resolveChatEnabled = (): boolean => {
  if (queryValue("chat") === "false") {
    // explicit `?chat=false` → disable and clear the persisted value
    writeStoredFlag(false);
    return false;
  }
  if (queryValueBoolean("chat")) {
    // bare `?chat` or `?chat=true` → enable and persist for later param-less loads
    writeStoredFlag(true);
    return true;
  }
  // param absent → fall back to localStorage, else default off
  return readStoredFlag();
};

// `?chatDebug` keeps the no-backend dry-run transport even after the live path exists,
// so the "what would be sent" view stays reviewable.
export const resolveChatDebug = (): boolean => queryValueBoolean("chatDebug");
