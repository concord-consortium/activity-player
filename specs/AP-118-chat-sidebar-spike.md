# Spike: Per-Page AI Chat Tutor in the Activity Player

**Jira**: https://concord-consortium.atlassian.net/browse/AP-118

**Status**: **Closed**

## Overview

A time-boxed spike that adds an opt-in AI chat tutor sidebar to the Activity Player (AP), scoped to
**one conversation per activity page**. A **Firebase Function in the `report-service` project** (the
same project AP already uses for student answers) keeps the OpenAI key server-side and, on each turn,
composes a system prompt from the page the student is on — where they are in the sequence/activity,
the page's authored text/images and question definitions, and an optional sim-specific prompt keyed by
the interactive's URL — while the student's live activity reaches the tutor through forwarded interactive
logs. The goal is to learn whether a contextual, page-aware tutor is useful — **not** to ship a
production feature.

Because it is a prototype it is off by default behind a flag (`?chat=true`), deployed only to
`report-service-dev`, and run with test/pilot data — never real student PII (conversation content still
reaches OpenAI; a production version needs a FERPA/PII + retention review).

The design generalizes a hackathon prototype (`steps-copilot`, which paired one interactive with a
hand-written per-question meta-prompt) to work across many pages and questions **without** LARA
authoring: by **scoping each chat to a single page** and **auto-assembling the tutor's context from
content authors already write** (question prompts, page text, authored question definitions) plus a
small **developer-maintained map of sim-specific prompts keyed by interactive URL**. Focus tracking and
model tool-calls are **dropped** entirely (the forwarded log stream conveys what the student is doing,
and page context is auto-injected); authoring and cross-page memory are deferred to later tiers.

## Architecture

```
AP sidebar (browser)                         Firestore (report-service)                Firebase Function
─────────────────────                        ──────────────────────────────────       ─────────────────
write user-message doc ────────────────────▶ /sources/{source}/chats/{key}            ──▶ onWrite trigger
  (+ page context refs)                          /activities/{activityId}/pages/{pageId}                            │
                                                   parent { conversationId, status,         ├─ txn lock on parent
show "…" (optimistic + status)                              lastProcessed* }                │   status (idle→generating)
                                                   /messages/{messageId}                    ├─ compose page system prompt
                                                                                            │   (orientation + page body
onSnapshot renders new docs ◀──────────────── write assistant-message, status:idle ◀───────┘   + sim prompt) and call OpenAI
                                                                                            └─ drain queued messages
```

- **One conversation per page**, keyed by **`activityId` + the stable `page.id`** (page ids collide
  across activities in a sequence, so the activity id is required). Navigating swaps to that page's
  conversation.
- **`onWrite` Firestore trigger** (not an HTTP endpoint) writes the complete assistant message as one
  doc; the sidebar's `onSnapshot` renders it. **No streaming.**
- **Per-conversation single-in-flight lock** via a Firestore transaction on the parent doc's `status`,
  with a **drain step** so messages that arrived while busy are processed in order.
- **No in-memory state** — per-conversation state (`conversationId`, `status`, drain cursor,
  `promptInstalled`) lives on the per-page parent doc, read fresh each invocation.

## Requirements

### Phase 1 — per-page chat loop with page-context system prompt

- **Sidebar UI & enablement.** Right-side sidebar in one of two layout modes chosen by the activity's
  layout type (shared chat component, only the wrapper differs): responsive activities → **push/reflow**
  (25% column, activity reflows to 75%); fixed-width activities → **overlay drawer** (`position: fixed`,
  activity untouched). Off by default, enabled purely by the URL (`?chat=true` / bare `?chat` → on;
  absent or `?chat=false` → off) with no persistence, so the flag never lingers across loads or leaks
  to other paths on the origin. Desktop/laptop viewport assumed. *(The
  overlay's thin-rail state was a Phase-1 stretch goal, not required for DoD.)*
- **Per-page conversation & transport.** Scoped to the current page, keyed by `activityId` + `page.id`.
  Sending **writes a `user` message doc**; the sidebar **subscribes (`onSnapshot`)** to that page's
  messages subcollection; the assistant reply appears when the function writes it. A **"Chat about: Page
  N — <title>"** header makes the scoping legible; navigation is a hard conversation swap (no cross-page
  memory in v1). Typing/pending indicator driven by both an optimistic check and the authoritative
  parent-doc `status` (`generating | idle | error`). Reload rehydrates from Firestore.
- **Per-conversation single-in-flight lock.** Only one turn per page conversation runs at a time,
  enforced by a Firestore transaction on the parent `status` (compare-and-set `idle → generating`) with
  a **drain step** (tie-safe `{createdAt, messageId}` cursor) so backed-off messages are processed in
  order. **Self-trigger guard** early-returns on any doc kind the function authored.
- **System prompt = the page, assembled server-side.** On each turn the function composes: generic tutor
  prompt (+ a prominent "guide, do NOT reveal the answer" block) + orientation (Sequence / Activity N of
  M / Page N of M) + page body in authored order (text `content`, image `name`, question `authored_state`
  definition — **no student answers injected**) + Phase-2 URL-keyed sim fragment. `authored_state` is
  sent raw (not a new exposure — the client already holds it). The OpenAI key, generic prompt, and
  sim-prompt map are **server-side only**, absent from every browser request and the JS bundle.
- **Auth & accessibility.** Existing Firebase auth governed by Firestore security rules modeled on the
  `answers` rules. Accessibility minimum bar: labeled composer + accessible send button, per-turn sender
  attribution in the DOM, a single `aria-live="polite"` region announced on assistant-message
  completion, AT-exposed "…" indicator, and keyboard focus management for the overlay drawer.

### Phase 2 — live sim-awareness: log forwarding + sim prompts *(specced; see Not Yet Implemented)*

- **Log forwarding.** Interactive log messages forwarded into the conversation as `kind:"log"` docs
  (dropping mouse-move/-button spam), fed to the model as **`developer`-role telemetry** wrapped in a
  typed data envelope. The model replies in the structured format (`{ userText: string | null }`); a
  routine log yields `userText: null` (nothing rendered) while the tutor stays aware and may proactively
  surface a message. **Cost control (required):** client-side spam drop/debounce + drain-step coalescing
  of queued logs into one combined turn.
- **Multiple-choice choice-map enrichment (client-side).** Because an MC log carries only the opaque
  choice id, the client maps id → human label using the emitting embeddable's `authored_state` and
  forwards the enriched label (so the tutor reads "Overall increase", not "2").
- **Sim-specific guidance (URL-keyed).** Optional per-sim system-prompt fragment injected from a
  developer-maintained server-side map, matched **host/subdomain-first** (extended to host + path/hash
  prefix for shared hosts), **version segments stripped**, with graceful fallback.

## Technical Notes

- **Firebase Function (new in `report-service`).** Lives in the existing `functions/` workspace,
  **1st-gen style** (`functions.runWith({secrets}).firestore.document(...).onWrite`). The OpenAI key is
  a `defineSecret`, the model id a `defineString` param; the **generic prompt and sim-prompt map ship as
  report-service source constants** (`chat/generic-prompt.ts`, `chat/sim-prompts.ts`), not params — see
  Decisions (OPS-2 deviation).
- **Per-conversation lock** is native Firestore (transaction compare-and-set + stale-lock reclaim + a
  self-contained idle-commit transaction) — no Cloud Tasks / `maxInstances` needed.
- **System-prompt assembly (hybrid).** The browser sends ids + the public activity URL + display-only
  orientation hints; the function **fetches the single-activity JSON server-side** (validated:
  https-only + authoring-host allowlist + shape/size/timeout guards), applies the legacy transform
  (`convertLegacyResource`), caches it by URL, and assembles the page body. This keeps the answer-bearing
  `authored_state` server-side. Two consequences: the convert transform is **lifted into report-service**;
  bundled sample activities aren't server-fetchable, so chat works only with **real URL-based activities**.
- **Conversation + reload.** OpenAI's Responses + Conversations API holds the running conversation
  (`conversationId` on the parent doc; only the new message is sent each turn); Firestore holds every
  visible turn as the UI's source of truth. The page prompt is installed once as a persistent
  **`developer`-role conversation item** (not via `instructions`, which is per-request), gated on a
  `promptInstalled` flag persisted only after the item + first response succeed.
- **Firestore layout.**
  - `/sources/{source}/chats/{key}/activities/{activityId}/pages/{pageId}` — parent doc:
    `{ conversationId, status, lastProcessedCreatedAt, lastProcessedMessageId, promptInstalled, lockedAt,
    ...ownerFields }`, `status ∈ {generating, idle, error}`.
  - `/sources/{source}/chats/{key}/activities/{activityId}/pages/{pageId}/messages/{messageId}` — turns:
    `{ kind: "user" | "assistant" | "log", ...ownerFields, createdAt, ... }`.
  - `{source}` = `portalData.database.sourceKey`; `{key}` = `learnerKey ?? runKey`; `{activityId}` =
    `activity.id`; `{pageId}` = `page.id`. `ownerFields` = the same identity fields `answers` docs carry.
- **De-risking probes (5) + emulator spikes (7, A–G).** All assumptions were verified before build — the
  OpenAI transport (developer-item persistence, stateless resume, structured `userText:null`,
  `output_text` accessor) against the **real API** (`gpt-5.5`, 2026-06-30 and again 2026-07-05); the
  lock/drain, security rules, and pure-module lift against the **Firebase emulator**. All passed.
- **Model id** is config-driven; `gpt-5.5` confirmed the current flagship (re-confirm as it advances).

## Out of Scope

- **Non-page chat surfaces** (introduction `currentPage === 0`, single-page-layout activities, completion
  page) — chat is hidden on them (no single current authored page). Activity/sequence-level conversation
  is a Later Tier.
- **Non-learner and preview sessions** — live chat mounts only for authenticated **learners** and real
  online **anonymous runs**; teachers/researchers (no `learnerKey`) and anonymous **preview** runs
  (offline via `disableNetwork()`) are excluded.
- **LARA system-prompt authoring/CRUD** — per-question context comes from existing `authored_state`,
  per-sim from the developer map.
- **Streaming** — the `onWrite` trigger writes a complete message.
- **Focus tracking and model tool-calls (incl. `get_state`)** — **dropped** (not deferred); page context
  is auto-injected and forwarded logs convey presence/activity.
- **Cross-page / global memory** — deferred; each page is its own conversation.
- **Image pixels / vision** — images contribute only their `name`/title.
- **Mobile / narrow-viewport layout** — desktop/laptop assumed.
- **Rate limiting / abuse controls** beyond a hard spend cap on the OpenAI key; production hardening,
  quotas, and a formal FERPA/PII + retention review.

### Accepted spike risks

- **Unauthenticated paid-API cost/abuse.** Anonymous chat docs are created unauthenticated (reusing the
  `answers` model), and every client-created `user`/`log` doc fires the trigger → a paid OpenAI call.
  Accepted for the spike with: dev-only project, a **hard spend cap on the OpenAI key** (a deploy
  precondition — see SEC-2), the per-conversation lock, and log debounce + drain-step coalescing.
  Production needs real rate limiting.
- **Anonymous cross-read** (inherited from the `answers` model). `anonymousRead()` grants read to any
  request whose target doc carries a `run_key` > 10 chars without checking it matches the requester, so
  any anonymous client can read another anonymous run's chat transcript. Accepted for the spike (dev-only
  project + test/pilot data, never real PII); production needs per-requester scoping or authenticated-only
  chat.

## Not Yet Implemented

The spec covers two phases plus a set of intentionally-deferred later tiers. As of closing, the spec and
the de-risking spikes are complete; the following were **specced but explicitly deferred** rather than
sliced into Phase-1-fine build steps:

- **Phase 2 (live sim-awareness)** — log forwarding from `handleLog`, the report-service log branch +
  coalescing, the client-side MC choice-map enrichment, and the URL-keyed sim-prompt map. Specced at
  file level but "not sliced into Phase-1-fine commits"; it is the deferred follow-on.
- **Later Tiers (design preserved, not lost):** global/cross-page conversation & memory; streaming via a
  2nd-gen HTTP/callable function; LARA authoring of per-question tutoring guidance; an `authored_state`
  answer-key-stripping transform (fallback if the raw approach leaks answers); a one-time "current
  answers" snapshot on chat-open (fallback if logs prove too blind — e.g. chat opened after working, or
  sim outcomes that never hit the log stream); image vision; broader (non-log) proactive triggers.
- **Spike-code cleanup before deploy** — the emulator-spike triggers (`chatSpikeOnWrite`,
  `chatTutorSpikeOnWrite`) are registered in report-service `index.ts` and must be removed (or evolved
  into the real RS-2/RS-3/RS-4 trigger) before `firebase deploy --only functions`.

## Decisions

### Requirements — core design (Design Decisions log, all settled)

#### Conversation scope — per page vs global/whole-activity vs per-question
**Context**: AP's chat bar spans a whole multi-page activity, so unlike the hackathon there is no
implicit "current question" to anchor the tutor.
**Options considered**:
- A) **Per-page** — one conversation per activity page.
- B) Global / whole-activity — one conversation across the activity.
- C) Per-question — anchor to a focused interactive.

**Decision**: **A) Per page.** AP navigates by page, a page is a bounded/knowable context that *is* the
tutor's meta-prompt, and per-page scoping lets us **drop** focus tracking and tools and **defer**
authoring. (Global re-introduces the "which question" problem and needs orientation tooling.)

#### Conversation key — `activityId` + `page.id` vs page index vs `page.id` alone
**Context**: The key must be stable and unique per page.
**Decision**: **Key on `activityId` + stable `page.id`.** Page positions shift when authors
add/remove/reorder/hide pages (so index is out), and `page.id` alone is **not unique across a sequence**
(verified: every activity's first page is `id: 1000` in the sample sequences), so the activity id is
required. The codebase already pairs the two (`ActivityAndPage` / `getSequenceActivityId()`).

#### System prompt — auto-assembled from the page vs authored meta-prompt
**Decision**: **Auto-assemble from the page** (orientation + text/image/`authored_state` definitions,
**no student answers**) + a URL-keyed sim prompt. Replaces the hackathon's hand-written per-question
meta-prompt and removes the need for LARA authoring. Images contribute name/title only (no pixels/URL);
text is raw content.

#### `authored_state` — raw vs answer-key-stripped
**Decision**: **Send `authored_state` raw**, with a "don't reveal the answer" instruction. Including the
answer key is not a new exposure (the client already loads it to render the question). Reversible — strip
the answer key later (a Later Tier) if the pilot shows leakage.

#### Do NOT inject the student's answers into the system prompt
**Context**: A system prompt is a one-time snapshot taken at conversation start — typically empty at
first page load — and with tools dropped it can't be refreshed.
**Decision**: **Exclude student answers from the prompt**; the student's work reaches the tutor via the
**forwarded log stream** (Phase 2) instead. Accepted gaps: chat opened after working (chat closed) leaves
the tutor blind to prior work; awareness depends on what each interactive logs. (Probe 4: open-response
answers flow through logs fully; MC logs only an opaque choice id — resolved by client-side MC
enrichment; sim outcomes aren't logged — covered only by the deferred snapshot-on-open tier.)

#### Backend shape — `onWrite` trigger, complete-message, no streaming
**Decision**: An **`onWrite` Firestore trigger** in `report-service`, writing a complete assistant
message (no streaming), reusing AP's Firebase auth + Firestore rules. Streaming deferred to a 2nd-gen
HTTP function (Later Tier).

#### Concurrency — per-conversation single-in-flight lock
**Decision**: A **Firestore transaction on the per-page parent `status`** (compare-and-set) + a drain
step. Native Firestore, no Cloud Tasks. Also resolves the earlier "concurrency of rapid sends" concern
for the per-conversation case.

#### Structured assistant responses (`{ userText: string | null }`)
**Decision**: The **model decides** when a (typically log-driven) turn needs no visible text — replacing
a backend context-vs-reply split and enabling model-judged proactivity. Paired with client debounce +
drain-step log coalescing to bound per-log OpenAI cost.

#### Sim-prompt URL matching
**Decision**: **Host/subdomain match** primary (verified: real sims have dedicated subdomains), **host +
path/hash prefix** for shared hosts, **version segments stripped**, ordered pattern list + graceful
fallback.

#### Dual-mode sidebar layout + accessibility minimum bar
**Decision**: Responsive → push, fixed-width → overlay; mobile out of scope. The accessibility minimum
bar (labeled composer, per-turn sender attribution, `aria-live` on completion, AT-exposed indicator) is
adopted as in-scope requirements.

### Requirements — resolved build-time confirmations

#### `page.id` uniqueness across a sequence
**Decision**: Verified **not unique** (every activity's first page is `id: 1000`); key on `activityId` +
`page.id` (path `/activities/{activityId}/pages/{pageId}`).

#### Server-side activity structure — how does the function get the page?
**Options considered**:
- A) Re-fetch the full resource every turn (wasteful).
- B) Client sends the page descriptor (schema drift + trusting client content + bloats the doc).
- C) **Hybrid** — client sends ids + URL; function fetches by URL, converts, caches, reads structure.

**Decision**: **C) Hybrid.** Client sends `{source, key, activityId, pageId}` + the activity/sequence
URL; the function fetches the **single activity** (~125–140 KB, per Probe 1 — not the 765 KB sequence),
applies `convertLegacyResource`, and caches by URL. Build consequences: the convert transform is lifted
into report-service; sample activities aren't server-fetchable.

### Implementation — interview decisions (settled)

- **Activity cache**: in-memory (module-level `Map`), warmed per instance; cold start re-fetches. Add a
  trivial TTL so a pilot author edit isn't served stale forever (ENG-3).
- **Set-prompt-once mechanism**: a persistent **`developer`-role conversation item** (see EXT-4), not
  `instructions`.
- **Build order**: debug-transport-first — the entire AP UI is buildable/demoable on a `DebugTransport`
  before report-service or OpenAI exist; the live `FirestoreTransport` flip is the last step.
- **MC choice-map enrichment**: **client-side** (the client already holds `authored_state`; no
  server-side correlation needed).
- **Trigger generation**: **1st-gen** (matches the existing `functions/` workspace; the lock lives in
  Firestore, so 2nd-gen buys nothing here).

### Review findings that changed the spec

All findings below were verified against actual source in both repos before acceptance and resulted in
concrete spec changes.

**Security**
- **SEC-1 — Function-owned fields must be un-writable by clients.** Client `create`s the parent **once**
  with owner fields only; `status`/`lockedAt`/drain cursor/`conversationId`/`promptInstalled` are
  Admin-written; **no client `update`** of the parent (so a client can never reset the lock).
- **SEC-2 — Spend cap is a deploy precondition.** Listed as an explicit precondition gate in the deploy
  runbook, not merely an accepted risk.
- **SEC-3 — Assistant docs need owner fields to be readable.** Admin *writes* bypass rules but client
  *reads* don't; an owner-field-less assistant doc fails `studentWorkRead()` and an `onSnapshot`
  collection listener is rejected wholesale. The function now stamps owner fields onto **every**
  function-written message doc. (Emulator-verified both ways.)
- **SEC-4 — Anonymous cross-read** documented as an accepted spike risk (dev-only + test data bounds it).
- **SEC-5 — Function-created parent needs owner fields too.** The acquire transaction stamps the
  triggering message's owner fields when the parent doesn't exist; the Phase-2 log-forward path also
  create-if-absents the parent with owner fields.

**Engineering / Firestore**
- **ENG-1 — Stale-lock reclaim.** Stamp `lockedAt`; reclaim a `generating` lock older than ~5 min so a
  mid-drain crash can't wedge a conversation forever.
- **ENG-2 — Structured-output accessor.** Confirmed `res.output_text` (Probe 3 / spike F).
- **ENG-3 — Cache TTL.** In-memory cache never invalidates → add a trivial TTL for pilot author edits.
- **ENG-4 — `serverTimestamp()` ordering.** Drain runs server-side after commit (timestamps resolved);
  the client `onSnapshot` may briefly show a pending doc (cosmetic).
- **ENG-5 — Liftability.** `chat-context.ts`'s claimed-pure deps weren't pure (`activity-utils` /
  `embeddable-utils` drag in React/Firebase). Extracted the pure walk helpers + `isQuestion` into a new
  `page-walk.ts` (imports `../types` only); both AP and the RS-1 lift import that.
- **ENG-6 — Crash-safe prompt install.** Persist `conversationId` **only after** the developer item +
  first `responses.create` succeed, together with a `promptInstalled` flag; install the prompt whenever
  `!promptInstalled` (not keyed off `conversationId` existing), so a failed first turn doesn't
  permanently strip page context.
- **ENG-7 — No composite index.** The drain is a range-only `createdAt >` query with `kind` filtered in
  JS (the emulator auto-creates and does **not** enforce composite indexes, so a `(kind, createdAt)`
  query would pass emulator tests and fail only on deployed Firestore).
- **ENG-8 — Orientation split.** The single-activity fetch has no sequence context, so the function
  derives **Page N of M** itself and fills **Sequence title / Activity N of M** from client-sent
  display-only hints (non-authoritative strings, unlike the server-fetched `authored_state`). Chosen over
  re-fetching the 765 KB sequence.
- **ENG-9 — Drain lost-wakeup race.** The final empty-check and the `status:"idle"` write must be the
  **same self-contained transaction** (re-read the cursor query inside the txn; commit idle only if
  empty). Emulator-verified; note the mechanism is pessimistic range-locking, so the transaction must
  never be held open across an external write (it would deadlock).

**Layout / Frontend / Accessibility**
- **FE-1 — `?chat` presence vs value.** `queryValueBoolean("chat")` returns `false` for both `?chat=false`
  and a missing param. This originally mattered for the `query → localStorage → default off` precedence,
  but **post-spike the localStorage persistence was removed** — the flag is now purely URL-driven (bare
  `?chat`/`?chat=true` → on; absent/`?chat=false` → off), so no persistence lingers across loads or leaks
  to other paths on the `activity-player.concord.org` origin. `resolveChatEnabled()` is now just
  `queryValueBoolean("chat")`.
- **UX-1 / EXT-2 — Mode flip on navigation.** With chat gated to concrete content pages, the flip is
  hidden ↔ push (responsive) or a consistent overlay (fixed-width); default the chat closed and move
  focus to the new wrapper's control on any appear/disappear, riding the AP-3 conversation re-key.
- **A11Y-1 — Focus management.** Opening the overlay moves focus in; closing restores it to the trigger;
  the thin-rail expand control carries `aria-expanded` + AT-exposed unread/typing state.

**DevOps / QA / Docs**
- **OPS-1 — Deploy runbook.** Added a two-repo sequenced runbook (secret → model param → deploy functions
  → deploy rules → spend-cap gate → flip AP live).
- **OPS-2 — Secret vs param, then source-constant deviation.** Only the OpenAI **key** is a `defineSecret`
  and only the **model id** a `defineString` param. **[Deviation 2026-07-05]** the generic prompt and
  sim-prompt map ship as **report-service source constants**, not params — a param bought no secrecy (the
  function never ships to the browser) but cost a split source-of-truth and awkward multi-line `.env`
  escaping. The absent-from-browser/bundle property still holds.
- **OPS-3 — Tooling versions.** No `firebase-functions` upgrade needed; the one new dep is `openai` in
  `functions/`. Rule tests extend the existing `tests/` workspace; `firebase-functions-test@0.3.3` can't
  offline-wrap a params-based trigger, so the trigger is tested against the live emulator.
- **QA-1 — Test seams.** `DebugTransport` is the no-backend UI/a11y seam; lock/drain/coalescing run
  against the emulators; integration-only DoD items (lock serialization, prompt content, structured
  `userText:null`) are tagged and cross-referenced to Validate-at-integration.
- **DOC-1 — `index.ts` export.** The new trigger is added to the existing `module.exports = {…}` object,
  not ES-`export`ed.
- **DOC-2 — MC field shape is an external contract.** `data.target_name`/`data.target_value` appear
  nowhere in AP source (observed in Probe 4's live tap) — code defensively, confirm in the pilot.

**External review**
- **EXT-1 — Field-whitelisting create rules.** `studentWorkCreate()` alone doesn't `hasOnly()` or
  constrain `kind`; added `chatParentCreate()` (owner fields only) and `chatMessageCreate()`
  (`kind=='user'` + whitelisted payload, rejecting `assistant` + server-owned fields), so the
  function-owned-fields guarantee is actually enforced.
- **EXT-2 — Concrete-page gate.** Live chat renders only when
  `activity.layout !== SinglePage && currentPage > 0 && !is_completion`; intro/single-page/completion are
  unsupported (guarantees `page.id` is defined wherever the transport mounts).
- **EXT-3 — Fetch hardening (confused deputy / SSRF).** `activityUrl`/`activityId` arrive on an
  anonymous-writable doc, so the function requires **https** + an **`AUTHORING_HOSTS` allowlist**, treats
  `context.params` as authoritative (asserts the message `activityId` matches), and guards the fetch with
  a timeout, size cap, `content-type` check, and minimal shape check.
- **EXT-4 — Persistent page prompt as a `developer` item.** `instructions` is per-request and **not**
  carried across turns (verified against OpenAI docs); the page prompt is installed once as a
  `developer`-role **conversation item**, which persists and auto-carries-forward. Empirically validated
  (Probe 3, spike F).
- **EXT-5 — Logs as `developer`-role telemetry with injection hygiene.** Forwarded logs go in as
  `role:"developer"` wrapped in a typed data envelope (student-authored fields are data, not
  instructions); `CHAT_GENERIC_PROMPT` carries a hygiene clause (logs never override "don't reveal the
  answer") and a **required** null-on-routine-logs rule (without it the model nudges on every log —
  breaks both the silent-awareness UX and the cost model). Empirically validated.
- **EXT-6 — Tie-safe drain cursor.** Stored as a `{createdAt, messageId}` pair; the drain queries
  `.orderBy("createdAt").orderBy("__name__").startAfter(...)` — deterministic even when coalesced logs
  share a `serverTimestamp()` millisecond, and no composite index needed.
- **EXT-7 — Identity gate.** An authenticated teacher has no valid `{key}` and is rejected by both rule
  branches; live chat mounts only for a real online anonymous run (`runKey`) or an authenticated learner
  (`userType === "learner"` && `learnerKey`). Teachers/researchers/preview are excluded.
