// `?chat` flag resolution.
//
// Resolves chat *visibility* (the render mode is chosen later by layout type). The flag is purely
// URL-driven for this spike — there is NO persistence, so behavior is fully determined by the current
// URL and nothing lingers across loads or leaks to other paths on the origin:
//   bare `?chat` or `?chat=true`  → on
//   absent or `?chat=false`       → off
import { queryValueBoolean } from "./url-query";

// `queryValueBoolean("chat")` is true for a bare `?chat` and `?chat=true`, and false for both
// `?chat=false` and a missing param — exactly the on/off semantics we want.
export const resolveChatEnabled = (): boolean => queryValueBoolean("chat");

// `?chatDebug` keeps the no-backend dry-run transport even after the live path exists,
// so the "what would be sent" view stays reviewable.
export const resolveChatDebug = (): boolean => queryValueBoolean("chatDebug");
