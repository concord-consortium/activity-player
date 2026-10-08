# Question Gating: Authored Setting and Unlock Message

**Jira**: https://concord-consortium.atlassian.net/browse/AP-76
**Repo**: https://github.com/concord-consortium/activity-player
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **In Development**

## Overview

Questions on an Activity Player page can start locked until the interactive above them unlocks them. The first AP-76 pull request built the locking, banners and reach as a demo driven by a URL parameter and the gate's saved state; this pull request replaces those stand-ins with LARA-226's authored setting and the `unlockQuestions` message that Wildfire (WM-66) sends.

## Project Owner Overview

Hazbot pages need students to run the Wildfire model and get Hazbot's feedback before they answer the questions about it. Authors now choose this per item in LARA ("Question Gating" on the Advanced Options tab), with their own banner text, and the model tells the Activity Player when the student has done enough. A student coming back to a page they already unlocked finds the questions open with no banner.

Nothing can lock students out by mistake: questions lock only behind an interactive that announces it can unlock them, so gating an interactive that cannot (including Wildfire without a Hazbot rule set) locks nothing. LARA's production deploy of the authoring setting waits for this release.

## Background

The demo (PR #591, `fc5bc504`, closed spec `specs/AP-76-disabled-questions-demo.md`) built everything the student sees: the planner and reach rules (page, section, the two-column rule, side-by-side gates), `DisabledQuestionsProvider`, inert disabled questions with readable "(locked)" headings, the per-question and notebook tab banners, the page's live region, the colors, and the Teacher Edition and locked-offering rules. None of that changes here except where listed below.

Two stand-ins are replaced:

- **Which items gate.** The demo read only `override:disableQuestionsAfter=<ref_id[:section],...>`. LARA-226 (lara PR #1270, closed spec `~/projects/lara/specs/LARA-226-question-gating.md`) now exports `question_gating`, `question_gating_locked_text` and `question_gating_unlocked_text` on every `MwInteractive` and `ManagedInteractive` (its R3).
- **When a gate unlocks.** The demo unlocked once the gate had saved state (Wildfire master saves when a run ends). The real signal is the `unlockQuestions` message, payload `IUnlockQuestionsMessage { restored?: boolean }`, sent only by interactives that declared `supportedFeatures.questionGating` (LARA-226 R10, R11). Hosts advertise `hostFeatures.questionGating = { version: "1.0.0" }` (R11), may receive the message at startup and repeatedly, treat it as idempotent, never persist it, and show no "now unlocked" feedback when `restored` is true (R13).

Wildfire (WM-66, wildfire-model PR #155, live on the Wildfire master build) declares `questionGating` only when a Hazbot rule set loaded (`hazbotRules=<id>` in its URL), sends `unlockQuestions()` on the first Hazbot click after a run ended in the visit, and at startup sends `unlockQuestions({ restored: true })` right after its declaration when its saved state has `questionsUnlocked`. AP-145 (PR #592, on this branch's base) makes every re-init carry the latest state, so a Wildfire top-bar reload keeps the unlock.

Measured on this branch's dev server against local LARA activity 41 (2026-10-08): Wildfire with `hazbotRules=23` said `hello` 900 ms after the page's question interactives, declared `{ questionGating: true }` 37 ms after its `hello`, and fired its iframe `load` event 405 ms after the declaration. Without `hazbotRules` it said `hello` and never posted `supportedFeatures` at all. The question interactives (multiple choice) each post `supportedFeatures` twice, without `questionGating`. On an anonymous run of the same page, Wildfire sent `unlockQuestions({})` on the first Hazbot click after a run ended, and on three return visits it sent `unlockQuestions({ restored: true })` in the same millisecond as its declaration, each time before its iframe `load` event (the LARA-226 end-to-end check measured about 3 ms).

## Requirements

### Which items gate

- **R1.** An item's gating comes from its authored `question_gating`: `"disable_following_on_page"` or `"disable_following_in_section"` gate with the demo's reach rules; a missing field, `null`, `"none"` or any other value means `"none"`.
- **R2.** `override:disableQuestionsAfter` stays as a development override on top of the authored values: each named `ref_id` is treated as authored with `"disable_following_on_page"` (or `"disable_following_in_section"` with `:section`), replacing its authored value; items it does not name keep their authored values. Its parsing is unchanged. A repeated parameter (which `queryValue` rejects) is warned about and ignored, and the authored gating still applies, so a malformed development URL never removes an author's gating.
- **R3.** As in the demo, only a visible interactive that saves learner state can gate; authored gating on any other item is ignored. Teacher Edition and locked offerings disable nothing.
- **R4.** A gate locks questions only once its interactive has declared `supportedFeatures.questionGating: true`. An override does not bypass this.

### Gate status

Each gate is in one of: **loading** (its questions are disabled but not grayed, no banner), **locked** (grayed, locked banner), **unlocked during the visit** (usable, unlocked banner), or **open** (usable, no banner). Open covers a gate unlocked from saved state and a gate that never declared support.

- **R5.** A gate starts loading when the page renders.
- **R6.** When the gate's interactive declares `questionGating: true`:
  - with no interactive state for that item, the gate becomes locked at once;
  - with interactive state (the latest state the Activity Player sent or received for the item is neither `null` nor absent), the gate stays loading for up to 1 second for a restored unlock, then becomes locked. This keeps a returning student from seeing the locked state for a frame.
- **R7.** A gate that has not declared within 5 seconds of its interactive's iframe `load` event becomes open. The 5 seconds restart whenever the Activity Player sends that interactive `initInteractive`, so an interactive that connects late, or whose `initInteractive` waits on a token, still gets the full window after it is initialized. A declaration after the gate became open is ignored for the rest of the visit.
- **R8.** `unlockQuestions` from a gate's interactive:
  - with `restored: true`, makes the gate open, whatever its status: no unlocked banner and no announcement;
  - without it, makes a locked gate unlocked during the visit, and a loading gate open (the student never saw it locked).
  - Repeats, and unlocks of an open or unlocked gate, change nothing. Unlocking is one way within a visit; nothing locks a gate again until the page reloads (including Clear & start over on the gate, and the interactive reloading itself).
- **R9.** Declarations and unlocks are honored from every runtime of the gate's interactive, including the runtime inside a dialog it opens. Messages from an item that is not a gate on the current page are ignored.
- **R10.** A gate whose interactive is not on screen keeps its status: collapsing the column that holds it, or switching notebook tabs, neither resets nor settles it. A gate collapsed away while still loading stays loading until its column is shown again and R6 to R8 settle it.

### Banner text

- **R11.** A gate's banners use its authored `question_gating_locked_text` while locked and `question_gating_unlocked_text` once unlocked during the visit. Authored text is shown with surrounding whitespace removed; a missing, `null` or empty (after trimming) text uses the Activity Player default for that state.
- **R12.** The default locked text is "Use <name> to unlock these questions.", where `<name>` is the gate item's own `name` (the authored name its question header shows, not the library interactive's type name), unquoted; when that name is missing or blank it is "Use the interactive to unlock these questions." The default unlocked text is "The questions are now unlocked!". The icons, colors and typography are unchanged.
- **R13.** When one banner speaks for several gates (a notebook tab banner, or a question that is the first disabled question of more than one gate), it is locked while any of those gates is locked, using the locked text of the first such locked gate in page order; it is unlocked once none is locked or loading and at least one unlocked during the visit, using the unlocked text of the gate that unlocked last; otherwise it is absent. (Today the per-question banner takes the last gate's state, so a question still locked by one gate can show another gate's unlocked banner.)
- **R14.** The page's live region announces each unlock during the visit with that gate's unlocked text (authored or default). Restored unlocks and gates that become open are not announced, and a gate with no questions after it is not announced, as today.

### Host protocol

- **R15.** Every `initInteractive` the Activity Player sends advertises `hostFeatures.questionGating = { version: "1.0.0" }`, alongside the existing `modal` and `getFirebaseJwt` entries, on every item (the host honors the message wherever it comes from; it acts only for gates).
- **R16.** The Activity Player depends on `@concord-consortium/lara-interactive-api` `1.15.0` and `@concord-consortium/interactive-api-host` `0.14.0`, pinned exactly as the current versions are.

### Sample activity and documentation

- **R17.** `sample-disabled-questions` gates through authored fields in its JSON, with no URL parameter needed, and its gating models are Wildfire master URLs carrying `hazbotRules=23` so they declare. Its description and page text describe the real rule (run the model, then click Hazbot Analysis) and the authored setting. One gate carries authored banner texts so the sample shows both authored and default text.
- **R18.** The README entry for `override:disableQuestionsAfter` describes it as a development override that sets `question_gating` on the named items over their authored values, and says the named interactive must declare question-gating support for anything to lock. Any other README or code comment that describes the saved-state stand-in is updated.

## Technical Notes

- **Code from the demo.** `src/utilities/disabled-questions.ts` (planner, tab banners, `nextGateStatus`), `src/components/activity-page/disabled-questions-context.tsx` (provider, `useQuestionLock`, `useTabBanner`, live region), `disabled-questions-banner.tsx` (texts, icons), `embeddable.tsx` (question banner, inert), `section.tsx` (tab banners), `single-page-content.tsx` (one provider per authored page).
- **Protocol.** `iframe-runtime.tsx` registers one listener per message type (iframe-phone allows one), so the declaration is read in the existing `supportedFeatures` listener, which also feeds `focusProtocol` to the `FocusManager`, and `unlockQuestions` is a new listener beside `navigation`. The `navigation` precedent passes a callback down `Embeddable` → `ManagedInteractive` → `IframeRuntime`. `ParentEndpoint` calls the connect callback on every `hello`, including after the interactive reloads its own page.
- **Saved state at declaration.** The gate's `ManagedInteractive` renders "Loading..." until its own answer arrives, so its `IframeRuntime` mounts already knowing the state; `currentInteractiveState` there is the latest state (AP-145). The provider no longer needs to watch the gate's answer, which removes the demo's doubled watch.
- **Package bump.** Checked with a throwaway install: both versions install with `npm install`, `npm install` writes `^` ranges unless given `--save-exact`, the new types (`"unlockQuestions"` in `ClientMessage`, `IUnlockQuestionsMessage`, `IHostFeatures.questionGating`, `ISupportedFeatures.questionGating`) compile, and the existing `src/components/activity-page` tests (145) pass unchanged on them. Node comes from `source ~/.nvm/nvm.sh`; the repo has no `.nvmrc`, so `nvm use` falls back to the default (22).
- **Report mode.** No caller passes `report` to `IframeRuntime`, so the Activity Player only ever sends runtime-mode `initInteractive`; R15 puts the flag in the shared `hostFeatures` rather than special-casing a mode nothing uses.
- **Wildfire item URLs.** A gating Wildfire item must point at a build with WM-66 (the master branch build now; `wildfire.concord.org/index.html` after the 1.7.0 release), carry `hazbotRules=<id>` with a rule set that exists (bundled ids include 23), and have "Enable save state" checked in LARA.
- **Rollout.** Staging runs Activity Player master and LARA staging already exports the fields, so gating works on staging once this merges. Production changes for students only when both this release and LARA's production deploy (held for it) are out; an activity imported from a staging export cannot be imported into production LARA before that deploy.
- **Local end-to-end check.** LARA at `http://localhost:3001` (`docker compose start app` in `~/projects/lara`), activity 41: page 1 has a page-wide gate with authored texts "AUTHORED LOCKED TEXT (page)" / "AUTHORED UNLOCKED TEXT (page)" on Wildfire master with `hazbotRules=23`; page 2 has a section gate on Wildfire master without `hazbotRules`, which never declares. Open with `http://localhost:8081/?activity=http://localhost:3001/api/v1/activities/41.json&preview&page=<n>`. `preview` keeps state only for the session, so return visits need an anonymous run (`runKey`) or a logged-in run.

## Out of Scope

- The reach rules, inert behavior, banner look and placement, live-region placement, and Teacher Edition and locked-offering rules, all unchanged from the demo.
- Logging lock and unlock events.
- A Hazbot image or interactive-supplied banner content.
- Telling an interactive in `initInteractive` that it is a gate.
- Re-locking, and persisting unlock state in the Activity Player (the interactive persists it).
- Fixing a gate whose collapsed column hides its first question's banner (accepted in the demo).
- Portal and teacher reports.

## Open Questions

### RESOLVED: When does a gate leave loading?
**Context**: The declaration and a restored unlock arrive over the iframe; a gate that never declares must not keep its questions disabled; switching to locked on the declaration shows the locked state for a frame before Wildfire's restored unlock (about 3 ms later). The integration prototype used a flat 15 s timeout from page render.
**Options considered**:
- A) A flat timeout from page render (the prototype).
- B) Settle on the declaration, holding loading briefly only when the item has saved state; open after a window measured from the iframe's `load` event, restarted by each `initInteractive` (R6, R7).
- C) Keep watching saved state as well (the demo's watch) and hold loading while it is present.

**Decision**: B. A flat window from render punishes slow-loading models (Wildfire's bundle took about 2.9 s locally before `hello`) and is too long for interactives that will never declare. Measured locally, a declaring Wildfire declares 37 ms after `hello` and before its `load` event, so 5 s after `load` (or after a late `initInteractive`) is generous, and it costs time only for misconfigured gates. A 1 s hold covers a restored unlock sent in the same tick as the declaration with a wide margin, and is spent only by returning students who have not unlocked. C keeps a second answer watch and a second unlock source the protocol replaced; the saved state the hold needs is already in the gate's `IframeRuntime`.

### RESOLVED: What does the override do now?
**Context**: Requiring a declaration means `override:disableQuestionsAfter` on an interactive that does not declare locks nothing; `sample-disabled-questions` uses Wildfire master without `hazbotRules`, so it would stop locking.
**Options considered**:
- A) The override also keeps the saved-state unlock, bypassing the declaration.
- B) The override only sets `question_gating`; the sample moves to authored fields and declaring URLs.

**Decision**: B. A would keep two unlock rules alive, one of which (any saved state) contradicts the PI's Hazbot rule, so testing with the override would show behavior students never get. With B the override still answers "what would gating look like here" on any page whose interactive declares, and the saved-state code and its tests go. Wildfire master with `hazbotRules=23` declares, so the sample keeps working.

### RESOLVED: Judgment call: which text does a banner shared by several gates show?
**Context**: A notebook tab, or a first disabled question shared by side-by-side gates, can stand for gates with different authored texts.
**Options considered**:
- A) The first locked gate's locked text in page order; when unlocked, the text of the gate whose unlock cleared it (R13).
- B) Default text whenever the gates' texts differ.
- C) All the texts, one per line.

**Decision**: A. The first locked gate is the one the student can act on next, so its text is the useful instruction, and the unlocked text belongs to the gate that just finished. B throws away authored wording on exactly the pages with more than one model; C stacks instructions in a banner meant to be one line.

### RESOLVED: Judgment call: does a non-restored unlock while loading show the unlocked banner?
**Options considered**:
- A) No: the gate becomes open (R8).
- B) Yes.

**Decision**: A. The unlocked banner announces a change the student saw; a student who never saw the locked state has none, matching the demo's rule that a gate unlocked on load shows no banner.

### RESOLVED: What are the default banner texts?
**Context**: The demo's locked text, "Run the Wildfire Explorer and Hazbot Analysis, then answer these questions!", is Hazbot-specific and would show for any gate without authored text. The text must make sense whether the questions are below the interactive or in the other column.
**Options considered**:
- A) Generic: "Use the interactive to unlock these questions."
- B) Keep the Hazbot wording.
- C) Generic, naming the interactive when it has a name.

**Decision**: C (Doug Martin, 2026-10-08), R12. The item's own `name` is used, unquoted; the library interactive's `data.name` is not, since it is the type ("Multiple Choice"), not authored. Names are often empty (every Wildfire item in the sample has `""`), so the fallback is common. Hazbot items carry the Hazbot wording as authored text. The unlocked default needs no name.

### RESOLVED: Low confidence: what does a click-to-play gate do before it is played?
**Context**: A gate with click-to-play loads no iframe until the student clicks its prompt, so it cannot declare, and under R5 to R7 its questions would stay loading (disabled, ungrayed, no banner) until the click. The demo, reading saved state, showed it locked (or open with saved state) before the click.
**Options considered**:
- A) Locked with its banner until played, unless it has saved state (then loading); after the click, R6 to R8 apply, and a gate that never declares turns open after the window.
- B) Loading until played, as R5 to R7 give.
- C) Open until played; a declaration after the click locks.

**Decision**: B (Doug Martin, 2026-10-08). R5 to R7 apply unchanged: it follows the contract (lock only after a declaration), needs no extra code, and click-to-play gates are rare. Its questions are disabled and ungrayed until the student plays the gate, then settle as any other gate's do.

## Self-Review

Roles: Senior Engineer, QA Engineer, Student, WCAG Accessibility Expert, Education Material Developer (author), DevOps. Findings with one defensible fix were applied in place (R6 defines "interactive state", R10 covers a gate collapsed while loading, Technical Notes gained the rollout order). The one that revisited a demo decision was settled by Doug.

### Student

#### RESOLVED: Loading now lasts until the model declares, not until its saved state arrives
In the demo a gate left loading when Firestore returned its answer, a fraction of a second. Now it leaves loading when the interactive declares, which waits for the model to download and start. Measured locally on a fast machine, the multiple-choice questions below Wildfire were rendered at about 2.0 s and Wildfire declared at about 2.9 s, so the questions sat disabled with no banner and no gray for about a second; on a school Chromebook or a slow network that gap grows to several seconds, and a misconfigured gate holds it for the whole window (R7). During it a click or Tab into a question does nothing and nothing says why. The demo chose "disabled, not grayed" (its "What does the page show while a gate's saved state is loading?" decision) when loading was brief.
**Options considered**:
- A) Keep R5 as written: disabled and ungrayed until the gate settles.
- B) After a short delay (about 1 s), show a loading gate as locked with its banner; if it then turns open, the banner goes away without announcement.
- C) Leave questions usable while loading, locking them when the declaration arrives.

Suggested: A. B shows a lock the contract says only a declaring gate may show, and flashes a banner on every misconfigured gate; C lets a student start an answer that then locks under them. Gates normally sit above their questions, so the student usually reaches the questions after the model has loaded.

**Decision**: A (Doug Martin, 2026-10-08). R5 stays as written.
