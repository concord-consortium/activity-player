# Fix "Blue Page of Death" for Expired Portal Token

**Jira**: https://concord-consortium.atlassian.net/browse/AP-69

**Status**: **Closed**

## Overview

When a portal access token expires (after ~5 minutes) and a user reloads Activity Player, the app shows a blank blue page with only the version number — no error message. This bug fix adds a user-facing error message instructing the user to relaunch the activity from the portal.

## Requirements

- When the portal bearer token is expired and a user reloads the page, an error message must be displayed instead of a blank blue page.
- The `auth` error message must be updated to be more actionable and student-friendly — it should tell the user to close the tab and relaunch the activity (avoid jargon like "portal").
- The existing Error component and error patterns should be reused where possible.
- The error must be visible even when no `activity` has been loaded into state (i.e., the error display must not be gated on `activity` being defined).
- The error must render in a properly styled container (matching the existing activity width/centering) even when no activity is loaded, so it looks visually consistent with normal error display.
- The error should instruct the user to close the tab (AP is launched in a new tab by the portal). No exit link or redirect is needed — this avoids open-redirect security concerns from using URL query params.
- The fix should handle all auth error scenarios (not just expired tokens) — any failure in the `fetchPortalJWT` or `fetchPortalData` calls should show the error.
- After an auth error in `componentDidMount`, execution should return early to avoid unnecessary work (activity loading, logger init, idle detector) and spurious console errors.
- A unit test must verify that the error is displayed when auth fails and no activity is loaded.
- A unit test must verify that the auth error UI does not render an exit link (since the user should close the tab instead).

## Technical Notes

**Relevant files**:
- `src/components/app.tsx` — Main App component; `componentDidMount` handles auth flow; `render()` and `renderActivity()` control error display
- `src/components/error/error.tsx` — Existing Error component with `auth`, `network`, `timeout` types
- `src/components/error/error.scss` — Error component styling
- `src/portal-api.ts` — `fetchPortalJWT()` and `fetchPortalData()` functions
- `src/utilities/auth-utils.ts` — `getBearerToken()` returns the token from URL params or OAuth

**Key architectural detail**: The Error component was rendered inside `renderActivity()` (line 544 of `app.tsx`). Since `renderActivity()` requires `activity` to be set, auth errors that prevented activity loading were never displayed. The fix moves error rendering to the top-level `render()` method with a check for `errorType && !activity`.

## Out of Scope

- Fixing the underlying expired token issue (switching portal to OAuth-based launch is a future story).
- Refreshing or renewing expired tokens automatically.
- Changes to the portal itself.
- Adding new error types beyond what's needed for this fix.
