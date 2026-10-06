# Disabled Questions: Activity Player Demo

**Jira**: https://concord-consortium.atlassian.net/browse/AP-76
**Repo**: https://github.com/concord-consortium/activity-player
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **In Development**

## Overview

Questions on an Activity Player page can start disabled, grayed out under a banner, until the student has used the interactive above them. This first AP-76 pull request builds the Activity Player side as a demo that runs without any LARA or Wildfire changes, so the look and behavior can be reviewed before those systems change.

## Project Owner Overview

On Hazbot pages the questions only make sense after the student has run the Wildfire model and seen Hazbot's analysis. Today nothing stops a student from answering first. AP-76 lets an author mark an item so the questions after it start disabled, with a banner explaining what to do, and unlock once the interactive says its condition is met. The feature is generic: any interactive can drive it, and the rule for "met" lives in the interactive.

The work spans three systems (Activity Player in AP-76, LARA in LARA-226, Wildfire in WM-66) and lands in several AP-76 pull requests. This one is the demo: a URL parameter stands in for the LARA authoring setting, and the model saving its first run stands in for the Wildfire unlock message. Design and research reviewers can open a link to an existing Wildfire activity, see the disabled questions, run the model, and watch them unlock. Their sign-off gates LARA-226 and WM-66. The shared overview of the rollout is at https://claude.ai/artifact/GjvEiMnamRiVFbUoEJ1BU9.

## Background

AP-76 originally asked for linked question interactives that know each other's state, a disabled state driven by rules such as "two sparks" or "two runs", a banner ("Run the Wildfire Explorer and Hazbot Analysis, then answer these questions!", changing to "The questions are now unlocked!") with a small picture of Hazbot talking, and author control over which questions depend on the model. A 2026-09-28 comment on the story asked for it to be generic: an authored per-item flag in LARA, passed to interactives, which tell the Activity Player when to enable the questions. The story was split on 2026-10-06 into AP-76 (Activity Player), LARA-226 (the `question_gating` authoring setting and the interactive API message, released as client `1.15.0` and host `0.14.0`) and WM-66 (Wildfire sends the message).

In this design the Activity Player only knows locked or unlocked. Rules like "two runs" belong to the interactive, so "make linked interactives aware of each other's state" is not needed. Author control over which questions depend on the model comes from placement: questions above the marked item, or outside the lock's reach, are never disabled.

Neither the LARA field nor the unlock message exists yet, so this pull request stands in for both:

- **The authored setting.** LARA-226 adds an optional per-item string enum, `question_gating`, to the activity JSON: `"none"` by default (an item without the field, which is every item authored before LARA-226, is `"none"`), and `"disable_following_on_page"` for an item whose following questions start disabled. The key names the feature and each value names one behavior, so later behaviors (for example `"disable_following_in_section"`) are new values, not new fields. Until then a URL parameter names the items to treat as `"disable_following_on_page"`. The parameter stays after LARA-226 as a development override, in the `override:` family with `override:locked`, so gating can be tried on an activity without editing it.
- **The unlock.** The marked item is treated as having met its condition once it has saved interactive state. For Wildfire this is a close match to "has run the model": the model saves one interactive state per completed run and nothing for pause, setup changes, or other controls (checked on LARA staging activity 1515 on 2026-10-05). It is also exactly what the final version does at startup, where the interactive reports from its own saved state. The stand-in unlocks when a run ends, whether or not the student asked Hazbot for analysis, so the review link's instructions need to say so; the banner's wording follows the ticket, not the stand-in.
- **The authored banner text.** LARA-226 adds locked and unlocked text fields, with Activity Player defaults when they are empty. Until then the banner shows the ticket's Hazbot wording in their place.

The questions this pull request disables are interactives the Activity Player already treats as questions. In activity 1515 the Wildfire model is itself an `MwInteractive` with `enable_learner_state` and no hidden question number, so it is question 1 on its page; "the questions after it" starts with the next item.

## Requirements

### Marking an item (demo stand-in)

- An `override:disableQuestionsAfter` URL parameter holds one or more embeddable `ref_id` values, comma-separated (for example `?override:disableQuestionsAfter=693-MwInteractive`). Each named embeddable is treated as having `question_gating: "disable_following_on_page"` and is a **gating item**.
- A gating item must be a visible interactive that saves learner state (an `MwInteractive` or a library `ManagedInteractive` with learner state enabled). A `ref_id` that is not on the current page, is hidden, or does not save learner state is ignored and disables nothing.
- Without the parameter, every page renders exactly as it does today.

### Which questions are disabled

- On the page holding a gating item, every question after it in page order is disabled while the gating item is locked. "Question" means an interactive that saves learner state, including ones whose question number is hidden.
- Page order is question-numbering order: visible sections in order, and within a split-layout section the left column and then the right, the way the page numbers questions. A gating item in the right column of a split section therefore disables nothing in that section's left column.
- A gating item's reach runs to the end of the page, across later sections (and, in the notebook layout, later tabs). In a single-page activity, which shows every page on one screen, it still ends with the authored page the gating item is on.
- Text boxes, images, and interactives that do not save learner state are never disabled.
- The gating item itself and everything before it are never disabled by that gating item.
- When a page has more than one gating item, a question is disabled while any gating item before it on the page is locked.

### Disabled questions

- A disabled question stays visible in place with its question number and header, and its interactive loads with any saved state so the student can see what is coming.
- It is visibly grayed out.
- It cannot be used with the mouse, keyboard, or touch: no clicks reach the interactive, its hint button, or its click-to-play prompt, and keyboard focus skips it.
- When it has a question heading, the heading stays readable by assistive technology and says the question is locked. A question with no header (hidden number, no name, no hint) has no heading for anyone, and the banner before the group explains the lock. Everything else in it (the interactive, hint, click-to-play, and other controls) is out of reach of assistive technology as well as pointer and keyboard.

### Banner

- While a gating item is locked, a banner sits immediately before the first question it disables, in the same column as that question.
- In the notebook layout, where only one tab shows at a time, each tab after the gating item's tab that holds a question it disables also shows the banner, full width under the tabs. The banner before the first disabled question appears only when that question is in the gating item's own tab and that tab has no tab banner; otherwise the gating item joins that tab's banner. So no tab shows two banners. A tab reached by more than one gating item shows one banner: locked while any of them is locked, unlocked once none is locked and one unlocked during the visit, and absent if all were unlocked when the page loaded.
- Locked text: "Run the Wildfire Explorer and Hazbot Analysis, then answer these questions!", beside the Activity Player's block icon (a circle with a slash). The icon is the same for every interactive and is not authored.
- When the gating item unlocks during the visit, its questions become usable at once and the banner text changes to "The questions are now unlocked!" and the icon to a check in a circle. That banner stays until the student leaves the page.
- The banner is announced to screen readers when its text changes.
- Banner text meets WCAG AA contrast (4.5:1) in its locked and unlocked forms, and the locked state is conveyed by the text, not by color or the icon alone; the icon is decorative to assistive technology.
- A gating item that is already unlocked when the page loads shows no banner and never shows the locked state.

### Unlocking (demo stand-in)

- A gating item unlocks once its saved interactive state exists: either already saved when the page loads, or saved during the visit.
- While the gating item's saved state is still loading, its questions cannot be used but are not grayed and show no banner; if the state turns out to exist, they become usable with no banner at all.
- Unlocking is one way within a visit. Clearing the gating item's state with "Clear & start over" does not lock the questions again until the page reloads.
- Unlocking works in every run mode the reviewers use: logged-in student runs, anonymous runs, and `preview`.

### Documentation

- The README's URL parameter list documents `override:disableQuestionsAfter`.
- A built-in sample activity, `sample-disabled-questions`, demonstrates the feature in full-width, 60-40, and 40-60 layouts and with two gating items, using a Wildfire build that saves state so every page can unlock during review.

### Modes

- Teacher Edition never disables questions.
- A locked offering (`override:locked` or a locked portal offering) disables nothing and shows no banner. Every interactive is already read-only there and no state is saved, so the questions could never unlock.

## Technical Notes

- **Rendering path.** `ActivityPageContent` renders visible sections (`SinglePageContent` does the same for every page of a single-page activity, without `ActivityPageContent`), each `Section` renders its `Embeddable`s, and an interactive becomes `ManagedInteractive` then `IframeRuntime` (`src/components/activity-page/`). Question detection is `isQuestion` in `src/utilities/page-walk.ts`; `{ignoreHideQuestionNumber: true}` is the variant that counts hidden-number questions, the same one `ManagedInteractive` uses to decide whether to watch an answer.
- **Saved state.** `watchAnswer(refId, callback)` in `src/firebase-db.ts` reports an embeddable's answer document, or `null`. `preview` runs Firestore offline with local snapshots (`initializeDB`). Checked against the dev server with activity 1515 in `preview`: nothing fired on load or while a run was going, `watchAnswer("693-MwInteractive")` fired with saved state within a second of pressing Restart, and a full reload started with no state again.
- **Precedents.** A locked offering already makes an iframe unusable: `iframe-runtime-locked` sets `pointer-events: none` and the iframe gets `tabIndex={-1}` (`iframe-runtime.tsx`, `isOfferingLocked` in `src/utilities/portal-data-utils.ts`, overridable with `?override:locked=true`). `setBackgroundInert` in `src/components/page-sidebar/sidebar-panel.tsx` sets `inert` by attribute, which React 16 needs since it does not know the `inert` prop.
- **Query parameters.** `queryValue` in `src/utilities/url-query.ts` returns one string or throws on repeats; comma-separated values follow `override.*` and other existing multi-value parameters.
- **Interactive-to-host messages.** The final unlock message will be a new `ClientMessage` handled next to the `navigation` listener in `iframe-runtime.tsx`, once LARA-226 releases it. Nothing in this pull request depends on its shape.
- **Banner icon.** LARA authoring has no image upload: authored images are pasted URLs (for example click-to-play's `image_url`), and its one upload path, `Api::V1::AuthoredContentsController`, is used only for rubric JSON and saves a direct `cc-project-resources.s3.amazonaws.com` URL with no CloudFront in front. So the banner uses an Activity Player icon instead of an authored image. A lock is out: the multiple-choice question interactive already shows one on answers that cannot be changed. The unlocked icon reuses `src/assets/svg-icons/icon-check-circle.svg`.
- **Collapsed columns.** A collapsed secondary column renders none of its embeddables, so collapsing a column that holds a gate's first disabled question hides that banner while disabled questions elsewhere stay grayed. Columns start expanded and only the student collapses one, so the demo accepts this; design review can revisit.
- **Demo pages.** The Activity Player's built-in sample activities cover each layout, so the review needs no new authoring. Open each as `?activity=<sample>&page=<n>&preview&override:disableQuestionsAfter=<ref_id>` on the dev server or a branch build. Counts were taken by walking each page in numbering order with the real sample data. Pages that repeat a `ref_id` are left out: the lock is keyed by `ref_id`, so every copy of a repeated id follows the copy after the gate (`sample-new-sections` pages 6 and 9 do this). Real LARA exports have unique ids.

  | Layout shown | Sample, page | Gating item | Expected |
  |---|---|---|---|
  | Full width (the Hazbot case) | `sample-activity-1100px`, 1 | `100250-MwInteractive`, Wildfire master | The one question after the model locks; finishing a run unlocks it |
  | 60-40, model on the left | `sample-new-sections-multiple-layout-types`, 7 | `371-ManagedInteractive`, Connected Bio | All 7 questions after it lock, in both columns |
  | 40-60, model on the right | `sample-new-sections-multiple-layout-types`, 4 | `339-ManagedInteractive`, Connected Bio | The left-column question stays open; the 2 below the model lock |
  | Responsive 50-50 | `sample-activity-responsive-50-50-layout`, 1 | `314-ManagedInteractive`, a multiple-choice question | The 2 questions after it lock; the Wikipedia embed and text are untouched |
  | Notebook tabs | `sample-activity-notebook`, 2 | `893-ManagedInteractive`, an open response | The 3 other questions in its tab and the questions on the two later tabs lock; Tabs 2 and 3 each show the banner under the tabs |
  | Single-page activity | `sample-new-sections-single-page-layout` (all pages on one screen) | `354-ManagedInteractive`, Connected Bio | The question after it on its page locks; the later pages' questions do not |
  | Ignored item | `sample-activity-responsive-50-50-layout`, 1 | `210508-MwInteractive`, a Wikipedia embed | Nothing locks, since the embed saves no state |

  The full-width Wildfire link serves the same build as `models-resources.concord.org/wildfire-model/branch/master` (identical asset hashes), which saves state when a run ends. `wildfire.concord.org/index.html` serves `v1.6.0`, which predates state saving, so a page using it shows the locked state but never unlocks. Connected Bio, Connected Bio Spaces and the question interactives are marked as saving state, but when each one first saves has not been checked; the review needs only the full-width page to unlock. LARA staging activity 1515 also has Wildfire master but no questions after the model. Because only the full-width page unlocks reliably, this pull request adds a purpose-built sample, `sample-disabled-questions`, with Wildfire master on every page (see the implementation plan); it is the main review link, and the table above covers the remaining layouts.

## Out of Scope

- The LARA authoring control for `question_gating` and reading it from the activity JSON (LARA-226, then a later AP-76 pull request). That pull request treats a missing field, `null`, and any value it does not know as `"none"`, so existing activities are unchanged and a newer LARA value never locks questions in an older Activity Player. The `override:disableQuestionsAfter` parameter stays and adds `"disable_following_on_page"` on top of the authored values; that pull request updates its README entry to match.
- The interactive-to-host unlock message and the `@concord-consortium/interactive-api-host` / `lara-interactive-api` bumps to `0.14.0` / `1.15.0` (LARA-226, then a later AP-76 pull request, merged after AP-143).
- Wildfire's unlock rule (any run, Hazbot feedback, sparks, runs) and sending the message (WM-66).
- Linked interactives watching each other's state.
- Final visual design of the disabled state and banner, pending design review of this demo.
- The authored banner text fields (LARA-226) and the Activity Player's default wording for empty fields (the later AP-76 pull request that reads them).
- Logging lock and unlock events; worth adding with the real message, when the unlock means what researchers will analyze.
- Portal and teacher reports, which show answers and are unaffected.

## Open Questions

### RESOLVED: Does a gating item disable the questions to the end of the page, or only to the end of its section?
**Context**: Placement is how authors choose which questions depend on the model. Section scope lets an author put independent questions in a later section of the same page; page scope is simpler to explain. In the notebook layout, sections are tabs, so page scope also reaches questions on other tabs.
**Options considered**:
- A) To the end of the page.
- B) To the end of the gating item's section.
- C) Support both in the demo with a second URL parameter.

**Decision**: A, decided by Doug Martin on 2026-10-06.

### RESOLVED: Where do the banner text and image come from once the feature is generic?
**Context**: The demo hardcodes the Hazbot wording, which suits the only consumer but not "any interactive".
**Options considered**:
- A) Authored per item in LARA, alongside the `question_gating` setting.
- B) Sent by the interactive in the unlock protocol.
- C) Generic Activity Player wording with no image.

**Decision**: A for the text, decided by Doug Martin on 2026-10-06: LARA-226 adds locked and unlocked text fields, and the Activity Player supplies defaults when they are empty. The image is not authored, because LARA has no image upload (see Technical Notes); the banner uses a generic Activity Player block icon, and a check once unlocked.

### RESOLVED: What shape does the LARA authoring setting take?
**Context**: The setting is a contract between LARA-226, the activity JSON, and the Activity Player, and the feature is expected to grow (the page-versus-section choice above is one candidate).
**Options considered**:
- A) A boolean "questions after this item start disabled".
- B) A string enum whose key names the feature and whose values name behaviors.

**Decision**: B, decided by Doug Martin on 2026-10-06: an optional `question_gating` field, with `"none"` (the default, and the meaning of a missing field) and `"disable_following_on_page"`. New behaviors are new values.

### RESOLVED: Judgment call: what stands in for the Wildfire unlock message?
**Options considered**:
- A) The gating item's saved interactive state (unlock once it exists).
- B) A demo-only "Unlock" button in the banner.
- C) A `customMessage` from the interactive.

**Decision**: A. Reviewers get the real flow, run the model and watch the questions open, with no Wildfire change, because the model already saves state once per completed run. B shows the transition but not the trigger. C needs a Wildfire change, which is the point of not doing one yet.

### RESOLVED: Judgment call: does a page that loads already unlocked show the unlocked banner?
**Options considered**:
- A) No banner when the condition was met before the page loaded.
- B) Always show the unlocked banner once unlocked.

**Decision**: A. "The questions are now unlocked!" describes a change the student just caused; on a return visit there is no change to announce. Design review can revisit.

### RESOLVED: Judgment call: are questions disabled in Teacher Edition?
**Options considered**:
- A) No, Teacher Edition shows everything usable.
- B) Yes, so teachers see what students see.

**Decision**: A. Teacher Edition runs as preview and is how teachers inspect the content; making them run the model first to read the questions adds friction and teaches nothing. Plain `preview` still disables, so the student view stays reviewable.

### RESOLVED: Low confidence: does the saved-state stand-in unlock before the student has run the model?
**Context**: The stand-in assumes Wildfire saves state only when a run ends.
**Options considered**:
- A) Accept: the demo is for reviewing look and flow, and WM-66 owns the real rule.
- B) Re-check the current Wildfire build before the demo link goes out.

**Decision**: A, after checking Wildfire master (`5000aff`). `saveRun` in `src/interactive-state.ts` is called only from `logSimulationEnded`, and only for the first end of a run that was started: burn-out (`ByItself`), Restart, Clear All, or the top-bar reload. Nothing else saves, and report mode never saves. The one gap is that starting a run and restarting it at once counts as a run, which is acceptable for a demo; WM-66 decides the real rule.

### RESOLVED: Low confidence: does `inert` on the embeddable wrapper keep keyboard focus out of a cross-origin iframe?
**Context**: The requirement that focus skips a disabled question rests on the browser treating an iframe inside an `inert` subtree as inert.
**Options considered**:
- A) `inert` on the embeddable wrapper.
- B) The locked-offering treatment on the iframe only (`tabIndex={-1}` and `pointer-events: none`).
- C) Both.

**Decision**: A. A throwaway page with a button, a cross-origin iframe (a different port) holding a button and a text field, and another button was tabbed through in Playwright. With a plain iframe as the control, Tab entered the frame and reached both inner controls in Chromium and Firefox, so the probe can fail. With the iframe inside an `inert` wrapper, Tab went straight from the first button to the last and `elementFromPoint` over the frame returned the page, not the iframe, in both browsers. The iframe-only treatment blocked the frame equally well, but it leaves the question header's hint button reachable, which `inert` on the wrapper covers in one place. WebKit would not launch on the test machine; Safari has supported `inert` since 15.5.

## Self-Review

### Senior Engineer

#### RESOLVED: "After the gating item" is undefined in split-layout sections
`Section` numbers questions down the left column and then the right (`getNumQuestionsLeftColumn` and `rightColumnQuestionNumberStart` in `section.tsx`), and which column is on the left depends on the layout: `30-70`, `40-60` and the responsive two-column layouts put the secondary column on the left. Authored order and numbering order disagree there.
- A) Authored order: the section's `embeddables` array order, whatever the column.
- B) Numbering order: left column, then right.
- C) In a split section, every other question in the section is after the gating item.

Decided B by Doug Martin on 2026-10-06: "after" follows the question numbers students see. A model in the right column of a split section does not disable that section's left column.

#### RESOLVED: A locked offering would show a banner that can never clear
On a locked offering `ManagedInteractive.handleNewInteractiveState` skips `createOrUpdateAnswer` (`!isOfferingLocked(portalData)`) and the iframe has `pointer-events: none`, so the gating item can never save state and its banner would ask the student to do something impossible. Fixed: a locked offering disables nothing and shows no banner.

---

### WCAG Accessibility Expert

#### RESOLVED: `inert` on the whole question hides its heading
`ManagedInteractiveHeader` renders the question number and name as an `h2` beside the hint button. With the question entirely inert, screen reader users lose the heading in heading navigation and cannot tell the questions exist, while sighted students see them grayed out. Fixed: the heading stays readable and says the question is locked; the interactive and every control stay out of reach.

#### RESOLVED: Banner contrast was unspecified
Grayed-out questions are exempt from contrast as inactive components, but the banner is the only explanation and must be readable. Added: AA contrast in both states, and the locked state carried by the text.

---

### Student

#### RESOLVED: The demo unlocks on a different condition than the banner names
The banner says to run the model and the Hazbot analysis, but the stand-in unlocks when a run ends, analysis or not. Reviewers would read the early unlock as a bug. Fixed: the Background says so and the review link's instructions must too; the wording stays as the ticket gives it, since WM-66 makes the real rule match.

---

### Cross-reference (requirements against the implementation plan)

#### RESOLVED: A requirement named a control that does not exist
The disabled-question requirement listed "hint, full-screen, or similar" header controls, but `ManagedInteractiveHeader` renders only the hint button; full-window and lightbox views open only at the interactive's request. Reworded to the hint button and click-to-play prompt, which the plan covers.

#### RESOLVED: The plan documented a parameter no requirement asked for
The README step had no requirement behind it. Added the Documentation requirement, since reviewers and the later AP-76 pull requests need the parameter written down.
