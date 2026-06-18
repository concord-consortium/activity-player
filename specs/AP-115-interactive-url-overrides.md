# Generic Interactive URL Overrides — Design

## Motivation

When testing a new branch or version of an interactive against the Activity Player, we currently cut a one-off branch of the Activity Player that adds a URL parameter and a hardcoded rewrite. Two examples exist on branches today: `qiBranch` on `AP-110-dialog-overlay-focus-trap` (rewrites question-interactives URLs to a given branch) and `wildfire` on `wildfire-tester` (rewrites every `wildfire.concord.org/` URL in the activity JSON to a given branch).

This pattern has three problems:

1. **Every new override target needs an Activity Player release.** With hundreds of interactives and new ones added often, this scales poorly.
2. **Overrides don't work on already-released Activity Players.** A developer wanting to test a new interactive against a previously released Activity Player version cannot do so — the in-code registry is frozen at release time.
3. **Each override is implemented twice** (once per branch), with different conventions (one applies per-interactive; one walks the whole activity JSON).

This spec defines a single generic mechanism that handles both existing cases and any future override target, *without* requiring an Activity Player release per target.

## Non-goals

- This is an internal testing tool. Not intended for end-user, classroom, or production-curriculum use.
- Not a general-purpose URL rewriting framework. Scope is limited to overriding the URL of an *interactive* (the iframe content the AP renders).
- Not a content-replacement system. We're rewriting URLs to point at different deployments of the same interactive, not substituting different interactives.

## URL parameter syntax

Overrides are specified as Activity Player URL query parameters of one of two forms:

```
override.<key>=<value>
override.<key>.<param>=<value>
```

- `<key>` is the registry key that selects which override rule to apply (e.g. `qi`, `wildfire`, `mr`).
- `<value>` is the substitution value, typically a branch name (e.g. `toolbar-accessibility`, `master`).
- `<param>` is an optional second identifier used by *parameterized* registry entries (see "Parameterized entries" below). For example, `override.mr.question-interactives=toolbar-accessibility` selects the `mr` entry with the param `question-interactives`.
- Multiple overrides can be active at once (`?override.qi=foo&override.wildfire=bar&override.mr.tectonic-explorer=baz`).

**Why `.` and not `:`** — `.` is an unreserved character in RFC 3986, never percent-encoded by URL libraries, never visually collides with the URL scheme separator, and reads naturally as a namespace separator.

**Value/param validation.** Before substitution, both `<value>` and `<param>` are matched against `/^[A-Za-z0-9._-]+$/`. Values that fail this check are ignored (no override applied) and a banner warning is shown. This is not a security boundary — the threat model already accepts that the user clicking the URL controls what gets loaded (see Security). It's a cheap guard against accidental URL corruption from typos, stray whitespace, copy-paste errors, etc.

## Registry JSON

When any `override.<key>=...` parameter is present in the URL, the Activity Player fetches a registry JSON file from a fixed URL:

```
https://models-resources.concord.org/runtime-config/interactive-override-registry.json
```

The URL is hardcoded in the Activity Player. The `runtime-config/` top-level project on `models-resources` is a new shared location for cross-product runtime configuration. The override registry is intentionally hosted outside the `activity-player/` deployment tree because the same registry will be consumed by `portal-report` and `collaborative-learning` once they adopt the same mechanism — all three are LARA-interactive hosts that load the same underlying interactives, so the URL-rewriting rules are the same regardless of which host is applying them.

Format:

```json
{
  "qi": {
    "prefix":  "https://models-resources.concord.org/question-interactives/",
    "match":   "(branch|version)/[^/]+/",
    "replace": "branch/${value}/"
  },
  "mr": {
    "prefix":  "https://models-resources.concord.org/",
    "match":   "${param}/(?:(?:branch|version)/[^/]+/)?",
    "replace": "${param}/branch/${value}/"
  },
  "wildfire": {
    "prefix":  "https://wildfire.concord.org/",
    "match":   "(branch/[^/]+/)?",
    "replace": "branch/${value}/",
    "scanAuthoredState": true
  }
}
```

The `qi` entry overlaps with `mr.question-interactives` — `mr` is the generic models-resources rule and would handle the qi case correctly on its own. `qi` is retained as a convenience shorthand. Duplication between a generic parameterized entry and a dedicated entry is an explicit pattern, not an accident: short keys make heavily-used cases easier to type and remember.

Per-entry fields:

| Field | Required | Description |
|---|---|---|
| `prefix` | yes | Literal string prepended to `match` (regex-escaped automatically) and to `replace` (literal-prepended). Anchors the rule to a specific host/path. |
| `match` | yes | Regex applied *after* `prefix`. Replaces from the start of `prefix` through the end of the regex match. May contain the placeholder `${param}` (see "Parameterized entries"). |
| `replace` | yes | Replacement string. Auto-prefixed with `prefix`. Supports `${value}` interpolation from the URL parameter value, and `${param}` if the entry is parameterized. Does **not** support `$N` capture-group references — captures are not exposed. |
| `scanAuthoredState` | no, default `false` | When `true`, the override is also applied to the interactive's `authored_state` field. See "Wrapper interactives" below. |

**Why prefix-plus-regex instead of raw regex or a full DSL.** Raw regex requires authors to escape every domain dot (`models-resources\\.concord\\.org`) and handle capture-group renumbering. A full DSL requires designing, parsing, and maintaining a grammar. The prefix-plus-regex split captures ~80% of the readability benefit of a DSL at ~5% of the implementation cost: domain dots are literal by construction, capture groups are unnecessary because the prefix is auto-prepended in the replace, and the host pinning becomes a top-level structural field that's reviewable at a glance.

**Why a remote JSON file.** Putting the registry in code would mean every new override target requires an Activity Player release — and would prevent the registry from being updated for already-released Activity Player versions. Hosting it remotely lets a developer add a new override target (e.g. for a brand-new interactive) and have that override immediately available on every released AP version that supports the mechanism.

**How the file is updated.** The registry file lives in a separate `runtime-config` git repository (out of scope for this spec). Developers edit it there, push, and a GitHub Action validates the change (JSON parse, schema check, regex compilation, sample-URL rule check) before deploying it to S3. Direct `aws s3 cp` is not part of the normal update flow — the GitHub Action is the only write path. This gives us git history, automated pre-deploy validation, and a clear blast-radius for breakage (a bad change is rejected before reaching S3; in the worst case the registry rolls back via the previous commit).

**ReDoS concern.** A buggy regex in the JSON can hang the tab of whoever uses an affected override. This is a self-inflicted footgun limited to internal testers — anyone hitting it is by definition someone who passed an `override.<key>=...` parameter, i.e. a developer or QA tester. The developer who introduced the bad entry will hit it the first time they try the override. Mitigations: (a) the `match` portion is constrained by `prefix` anchoring, reducing the size of the input subject to backtracking; (b) JSON authors should keep `match` small. We are not introducing a regex linter in v1.

## Parameterized entries

A registry entry that contains the placeholder `${param}` in its `match` or `replace` fields is a **parameterized entry** — it requires the URL parameter to use the three-segment form `override.<key>.<param>=<value>`. Parameterized entries let a single registry rule cover families of URLs that share a structure but differ in one identifier.

The motivating case is `mr`: most interactives on `models-resources.concord.org` follow the layout

```
https://models-resources.concord.org/<project>/(branch/<branch>/ | version/<version>/)?
```

A parameterized entry can express the whole family — including projects nobody has added a registry entry for yet — with one rule. The `<project>` slot is carried in the URL parameter's `<param>` segment.

**Substitution rules:**

- `${param}` in `match` is **regex-escaped** before substitution (same treatment as `prefix`). This prevents a URL parameter with regex metacharacters from injecting pattern semantics.
- `${param}` in `replace` is substituted **literally**.
- `${value}` is substituted literally into `replace` and is not legal in `match`.
- An entry is detected as parameterized if `${param}` appears anywhere in `match` or `replace`. There is no explicit `requiresParam` flag — the placeholder presence is the declaration.

**Mismatch handling:**

- URL uses two-segment form (`override.<key>=<value>`) but the entry is parameterized → warning, override not applied.
- URL uses three-segment form (`override.<key>.<param>=<value>`) but the entry is not parameterized → warning, override not applied.

Both cases are usage errors. Failing with a banner warning is more debuggable than silently ignoring.

## Application sites

The Activity Player computes interactive URLs in three places. The override system applies at all three:

1. **`src/components/activity-page/managed-interactive/managed-interactive.tsx`** — main interactive URL (currently `iframeUrl` near line 349).
2. **`src/components/activity-page/managed-interactive/iframe-runtime.tsx`** — `showModal`-supplied URLs for dialogs opened by the running interactive (near line 519).
3. **`src/components/activity-page/managed-interactive/lightbox.tsx`** — `showModal`-supplied URLs for lightbox content (near line 90).

Sites 2 and 3 receive URLs from the LARA interactive API at runtime — they are not in the activity JSON. We still apply overrides there for consistency: if a developer is testing a new branch of a dialog-popped interactive, they expect the override to take effect when the host interactive opens it.

## URL-field application

Applied at all three sites (main interactive URL, `showModal` dialog URL, lightbox URL). For each URL, applying an override is a two-pass operation:

1. **Pass A — raw regex on the full URL string.** Catches the common case where the override target appears in the host/path of the URL directly.
2. **Pass B — decoded query-param scan.** Parse the URL with `new URL(...)`, iterate `searchParams`, apply the compiled regex to each decoded value, and write back with `searchParams.set(...)`. This handles the wrapper-interactive case where the inner URL is passed to the wrapper as a percent-encoded query parameter.

`URLSearchParams.toString()` re-encodes values automatically, so authors writing override entries never need to think about percent-encoding.

When multiple `override.<key>=...` parameters are active, each registry entry is applied independently, in the alphabetical order of the keys. Order matters only if two prefixes overlap, which the host-pinning convention should prevent in practice; alphabetical is just a tiebreaker for determinism.

## `authored_state` application (opt-in)

Some interactives are "wrapper" interactives: an outer iframe that internally loads a different interactive. Wrappers receive the inner URL either:

- As a query parameter on their own URL (handled by URL-field Pass B above), or
- Embedded in their `authored_state` field (handled by this section).

When a registry entry has `scanAuthoredState: true`, the Activity Player applies the compiled regex to the interactive's `authored_state` value (which is a JSON-encoded string) before passing it to the wrapper iframe. This is a single pass — `authored_state` is not URL-encoded, so the dual-pass treatment is not needed.

This applies only at the main `managed-interactive` site. `showModal`-supplied dialogs (sites 2 and 3) do not carry an `authored_state` field, so `scanAuthoredState` is meaningless for them.

Because the override happens *before* the wrapper iframe is constructed, the wrapper's runtime behavior — reading its inputs and loading the inner URL — is unaffected. The Activity Player never has to touch the wrapper's JavaScript.

**Default is `false`.** Authors must explicitly opt in per registry entry. This keeps the simple case simple and avoids accidental matches in unrelated `authored_state` content.

## Known limitations

Documented as "not supported in v1" rather than blocking the design:

1. **Wrappers that compute the inner URL in their own JavaScript** (e.g. fetch a config from their own server, or build the URL from user state). The Activity Player never sees the inner URL and cannot rewrite it. No general fix; would require per-wrapper cooperation.
2. **Inner URLs embedded inside JSON-as-a-query-param** (e.g. `?config=%7B%22url%22%3A%22https%3A%2F%2F...%22%7D`). Neither raw scan nor decoded-param scan catches this. Workaround: the wrapper can be given a registry entry with `scanAuthoredState: true` and the inner URL moved there.
3. **Overrides on URLs computed entirely client-side after page load** (anything beyond the three application sites listed). Out of scope.

## Banner UI

Whenever at least one override is active for the current Activity Player session, render a top banner that:

- Lists each active override (`override.qi = toolbar-accessibility`, `override.wildfire = master`).
- Visually distinguishes itself from the normal Activity Player chrome (color/typography) so testers cannot miss it.
- Shows an error state if the registry JSON could not be fetched, or if a referenced `<key>` is not present in the registry.

The wildfire-tester branch's banner is the model. Generalize it to handle multiple concurrent overrides.

## Failure modes

| Condition | Behavior |
|---|---|
| Registry JSON fetch fails (network error, 404, 500, non-JSON body) | Banner shows error; no overrides applied; activity loads normally otherwise. |
| Registry JSON is valid but a referenced `<key>` is absent | Banner shows warning for that key; that override is not applied; other overrides and the activity load normally. |
| `<value>` or `<param>` fails charset validation | Banner shows warning for that key; that override is not applied. |
| URL omits `<param>` but the entry is parameterized | Banner shows warning for that key; that override is not applied. |
| URL supplies `<param>` but the entry is not parameterized | Banner shows warning for that key; that override is not applied. |
| Registry entry has a malformed `match` regex (won't compile, after `${param}` substitution if applicable) | Banner shows error for that key; that override is not applied. |
| Registry JSON contains entries not referenced by any `override.<key>=` parameter | Ignored. Unreferenced entries cost nothing. |

The activity should always render. Override failures are testing-tool failures and must not break the activity itself.

## Caching

The registry JSON is served with `Cache-Control: no-cache`. The file is small, fetched only when an `override.<key>=...` parameter is active (so it doesn't affect normal-use latency), and testers iterating on the registry want their changes visible immediately. The latency cost of a non-cached fetch is acceptable for a developer-only feature.

The Activity Player does not implement its own cache layer for the registry — it relies on the server's `Cache-Control`.

## Security

The threat model is unchanged from the existing Activity Player. The AP has long supported loading an activity from a user-supplied URL (`?activity=https://...`), which already lets a crafted URL cause arbitrary iframe content to load. The override mechanism is strictly *less* powerful than this existing capability: it can only rewrite URLs that pass an explicit per-entry `prefix` and `match` filter declared by Activity Player developers in the (developer-controlled) registry JSON.

Specific points:

1. **No new XSS / SSRF / open-redirect surface beyond the existing `?activity=` capability.** Any attack reachable via an override parameter is also reachable via crafting a malicious activity JSON and pointing the user at it via `?activity=`.
2. **The registry JSON is a critical-trust asset.** Whoever can publish to it can hijack overrides for every host-app session that activates an override. Write access is gated by the `runtime-config` repo's GitHub permissions plus the deploy action's S3 credentials — the registry is only mutated by the GitHub Action's deploy step. Direct S3 writes by humans are not part of the normal flow. The Action runs a validator before each deploy, which catches structural mistakes (bad JSON, bad regex, schema violations) before they reach the bucket.
3. **The host-pinning of each registry entry (`prefix`) is the structural security control.** Every entry must declare which host/path it can rewrite to. The `prefix` field is structurally visible and is what allows a developer adding an entry to verify at a glance that the rule is scoped to a Concord-owned host before publishing. Because the registry lives in a git repo, any change is also visible in PR review when one is opened.
4. **Banner mitigates user-facing phishing.** If a user clicks a link with an override parameter and the banner is shown, they have visible evidence that the Activity Player is not loading the default content.
5. **Value charset validation** (`/^[A-Za-z0-9._-]+$/`) prevents accidental URL corruption, not malicious attacks. It is intentionally not relied on as a security boundary.

## Migration

The two existing branches (`AP-110-dialog-overlay-focus-trap` carrying `qiBranch`, and `wildfire-tester` carrying `wildfire`) are not in the master branch. Implementation strategy:

- Stand up the `runtime-config` repo with the initial `interactive-override-registry.json` containing `qi`, `mr`, and `wildfire` entries. `qi` and `wildfire` replicate the behavior of the two existing branches; `mr` covers the generic models-resources case for all other current and future interactives.
- Implement the override mechanism in the Activity Player on `master`.
- The existing development branches can be rebased onto the new generic mechanism if they are still in use, or retired if not. No code from those branches needs to merge.

No legacy-compatibility shim is needed. The branch-specific parameters never shipped to master.

**Cross-host rollout** is independent of this spec. Once activity-player ships the mechanism, `portal-report` and `collaborative-learning` can adopt the same registry by implementing their own equivalent of the URL-rewriting code at their own URL-loading sites. The registry format and the registry URL stay identical across all three hosts.

## Out of scope for v1

- Registry signing or integrity verification beyond HTTPS.
- A regex/DSL linter or sandbox for `match` patterns.
- UI for browsing or editing the registry.
- Per-environment registries (staging vs. production AP).
- Overrides on URLs other than interactive URLs (e.g. asset URLs, library URLs).
- A `?registryUrl=...` parameter for pointing the AP at an alternate registry (e.g. for testing a registry change before promoting it). This is purely additive and can be added later if registry-change safety becomes a real pain point. The GitHub Action validator in the `runtime-config` repo is the cheaper first-line defense and is expected to cover the common cases.

If any of these become necessary later, they can be added as additive changes; nothing in this design forecloses them.
