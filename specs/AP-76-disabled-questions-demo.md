# Disabled Questions: Activity Player Demo

**Jira**: https://concord-consortium.atlassian.net/browse/AP-76

**Status**: **Closed**

## Overview

Questions on an Activity Player page can start disabled, grayed out under a banner, until the student has used the interactive above them. This first AP-76 pull request builds the Activity Player side as a demo that runs without any LARA or Wildfire changes, so the look and behavior can be reviewed before those systems change.

The work spans three systems (Activity Player in AP-76, LARA in LARA-226, Wildfire in WM-66). In this demo a URL parameter stands in for LARA-226's `question_gating` authoring setting, and the gating interactive's first saved state stands in for WM-66's unlock message. The Activity Player only knows locked or unlocked; rules such as "two runs" belong to the interactive, and authors choose which questions depend on the model by placement.

## Requirements

### Marking an item (demo stand-in)

- An `override:disableQuestionsAfter` URL parameter holds one or more embeddable `ref_id` values, comma-separated (for example `?override:disableQuestionsAfter=693-MwInteractive`). Each named embeddable is treated as having `question_gating: "disable_following_on_page"` and is a **gating item**. A `ref_id` with a `:section` suffix (for example `693-MwInteractive:section`) is treated as `"disable_following_in_section"` instead.
- A gating item must be a visible interactive that saves learner state (an `MwInteractive` or a library `ManagedInteractive` with learner state enabled). A `ref_id` that is not on the current page, is hidden, or does not save learner state is ignored and disables nothing.
- Without the parameter, every page renders exactly as it does today.

### Which questions are disabled

- On the page holding a gating item, every question after it in page order is disabled while the gating item is locked. "Question" means an interactive that saves learner state, including ones whose question number is hidden.
- In a split-layout section, a gating item disables the questions below it in its own column and every question in the other column, wherever they sit. Columns are side by side, and which other-column items are beside or below the gate depends on heights that change as the page reflows, so the whole other column counts as after the gate. A question above the gate in its own column stays open. A model pinned on the right therefore locks every question scrolling beside it on the left. A question that should stay open goes in a separate section, above or below the two columns (a separate tab in the notebook layout).
- Sections follow in order, and questions are listed in question-numbering order (left column, then right).
- A gating item's reach runs to the end of the page, across later sections (and, in the notebook layout, later tabs). In a single-page activity it still ends with the authored page the gating item is on.
- With `"disable_following_in_section"`, the reach ends with the gating item's own section (in the notebook layout, its own tab), with the same column rule inside that section. It can only name the item's own section, since an authored reference to another section would break when items move or sections are deleted.
- Text boxes, images, and interactives that do not save learner state are never disabled.
- The gating item itself and everything before it are never disabled by that gating item.
- When a page has more than one gating item, a question is disabled while any gating item before it on the page is locked.

### Disabled questions

- A disabled question stays visible in place with its question number and header, and its interactive loads with any saved state.
- It is visibly grayed out.
- It cannot be used with the mouse, keyboard, or touch: no clicks reach the interactive, its hint button, or its click-to-play prompt, and keyboard focus skips it.
- When it has a question heading, the heading stays readable by assistive technology and says the question is locked. A question with no header has no heading for anyone, and the banner before the group explains the lock. Everything else in it is out of reach of assistive technology as well as pointer and keyboard.

### Banner

- While a gating item is locked, a banner sits immediately before the first question it disables, in the same column as that question.
- In the notebook layout, each tab after the gating item's tab that holds a question it disables also shows the banner, full width under the tabs. The banner before the first disabled question appears only when that question is in the gating item's own tab and that tab has no tab banner; otherwise the gating item joins that tab's banner, so no tab shows two. A tab reached by several gating items shows one banner: locked while any is locked, unlocked once none is locked or still loading and one unlocked during the visit, and absent if all were unlocked when the page loaded.
- Locked text: "Run the Wildfire Explorer and Hazbot Analysis, then answer these questions!", beside a block icon (a circle with a slash), on a light blue banner (`#C1DAFF`). The icon is not authored.
- The unlocked banner is green (`#63D199`). Both use `#222` text in Lato, 20px bold, from the Zeplin design: 11.2:1 contrast on the blue and 8.4:1 on the green.
- When the gating item unlocks during the visit, its questions become usable at once, the text changes to "The questions are now unlocked!" and the icon to a check in a circle. That banner stays until the student leaves the page.
- Each unlock during the visit is announced to screen readers from one live region per page, outside the questions and the notebook tabs, so it is heard even when the banner sits in a hidden tab or a collapsed column. The banners themselves are not live regions, so an unlock is announced once.
- Banner text meets WCAG AA contrast in both forms, and the locked state is conveyed by the text, not by color or the icon alone; the icon is decorative to assistive technology.
- A gating item that is already unlocked when the page loads shows no banner and never shows the locked state.

### Unlocking (demo stand-in)

- A gating item unlocks once its saved interactive state exists: either already saved when the page loads, or saved during the visit.
- While the gating item's saved state is still loading, its questions cannot be used but are not grayed and show no banner.
- Unlocking is one way within a visit. "Clear & start over" on the gating item does not lock the questions again until the page reloads.
- Unlocking works in logged-in student runs, anonymous runs, and `preview`.

### Documentation

- The README's URL parameter list documents `override:disableQuestionsAfter`.
- A built-in sample activity, `sample-disabled-questions`, demonstrates the feature in full-width, 60-40, and 40-60 layouts, with two gating items, and with a gate limited to its section, using Wildfire master (which saves state when a run ends) on every page.

### Modes

- Teacher Edition never disables questions.
- A locked offering (`override:locked` or a locked portal offering) disables nothing and shows no banner, since no state is saved there and the questions could never unlock.

## Technical Notes

- **Code.** `getSectionColumns` (`src/utilities/section-columns.ts`) is the one source of a section's column order, shared by `Section` and the planner. `planDisabledQuestions`, `planTabBanners` and `nextGateStatus` (`src/utilities/disabled-questions.ts`) are pure and kept out of `page-walk.ts`, which must stay liftable into the report service. `DisabledQuestionsProvider` (`src/components/activity-page/disabled-questions-context.tsx`) watches each gate with `watchAnswer` and wraps `ActivityPageContent`'s sections, and each authored page in `SinglePageContent`. `Embeddable` reads `useQuestionLock`; `Section` reads `useTabBanner`. `useInert` sets the `inert` attribute, which React 16 does not know as a prop.
- **Where things go.** The banner is the first child of the first disabled question's cell, so it takes the question's width in every layout and a taller cell fires the visibility tracker's existing `ResizeObserver`. The tab banner is the first child of the tab's section with `grid-column: 1 / -1`. The provider renders the page's live region, visually hidden, only when the page has gating items. `inert` goes on the iframe runtime root and the click-to-play root; the hint button is natively disabled; the heading keeps a visually hidden " (locked)". The dialog overlay's runtime is not made inert, since it opens only at the interactive's request.
- **Saved state.** `watchAnswer` reports the answer document or `null`; `preview` runs Firestore offline. Firestore raises an empty cached snapshot first only when the client is offline (`shouldRaiseInitialEvent` in `@firebase/firestore` 3.4.9), so an online returning student never sees the locked state flash. Wildfire master's `saveRun` is called only when a started run ends (burn-out, Restart, Clear All, reload), so the demo unlocks when a run ends, with or without Hazbot analysis. `wildfire.concord.org/index.html` serves `v1.6.0`, which never saves state.
- **Repeated parameter.** `queryValue` throws on a repeated parameter and the app has no error boundary, so the provider catches it, warns, and disables nothing.
- **Banner icon.** LARA authoring has no image upload, so the banner uses Activity Player icons. A lock icon was ruled out because the multiple-choice interactive already uses one for answers that cannot change.
- **Collapsed columns.** A collapsed secondary column renders none of its embeddables, so collapsing one that holds a gate's first disabled question hides that banner. Accepted for the demo; design review can revisit.
- **Repeated ref_ids.** Locks are keyed by `ref_id`, so a page that repeats an id locks every copy after the gate. Real LARA exports have unique ids; some built-in samples (`sample-new-sections` pages 6 and 9) do not.
- **Demo pages.** `?activity=sample-disabled-questions&preview&override:disableQuestionsAfter=9101-MwInteractive,9102-MwInteractive,9103-MwInteractive,9104-MwInteractive,9105-MwInteractive,9116-MwInteractive:section` opens the whole demo; page 5 shows the section limit. Other layouts, with `&page=<n>&preview&override:disableQuestionsAfter=<ref_id>`:

  | Layout | Sample, page | Gating item | Expected |
  |---|---|---|---|
  | Full width (the Hazbot case) | `sample-activity-1100px`, 1 | `100250-MwInteractive`, Wildfire master | The question after the model locks; finishing a run unlocks it |
  | 60-40, model on the left | `sample-new-sections-multiple-layout-types`, 7 | `371-ManagedInteractive` | All 7 questions after it lock, in both columns |
  | 40-60, model on the right | `sample-new-sections-multiple-layout-types`, 4 | `339-ManagedInteractive` | The left-column question and the 2 below the model lock |
  | Responsive 50-50 | `sample-activity-responsive-50-50-layout`, 1 | `314-ManagedInteractive` | The 2 questions after it lock |
  | Notebook tabs | `sample-activity-notebook`, 2 | `893-ManagedInteractive` | The 3 other questions in its tab and the questions on Tabs 2 and 3 lock; Tabs 2 and 3 show the banner under the tabs |
  | Single-page activity | `sample-new-sections-single-page-layout` | `354-ManagedInteractive` | The question after it on its page locks; later pages' questions do not |
  | Ignored item | `sample-activity-responsive-50-50-layout`, 1 | `210508-MwInteractive` | Nothing locks, since the embed saves no state |

## Out of Scope

- The LARA authoring control for `question_gating`, with its three values, and reading it from the activity JSON (LARA-226, then a later AP-76 pull request). That pull request treats a missing field, `null`, and any unknown value as `"none"`. `override:disableQuestionsAfter` stays and adds `"disable_following_on_page"` on top of the authored values; that pull request updates its README entry.
- The interactive-to-host unlock message and the `@concord-consortium/interactive-api-host` / `lara-interactive-api` bumps to `0.14.0` / `1.15.0` (LARA-226, then a later AP-76 pull request).
- Wildfire's unlock rule (the PIs chose "ran the model and clicked Hazbot at least once") and sending the message (WM-66).
- Linked interactives watching each other's state.
- A Hazbot image in the banner, or letting the interactive supply richer banner content once it loads (a possible later version; LARA cannot upload images, so the banner stays text and a generic icon).
- The authored banner text fields (LARA-226) and the Activity Player's default wording for empty fields.
- Logging lock and unlock events; worth adding with the real message.
- Portal and teacher reports.

## Not Yet Implemented

- Converting the older copies of the visually hidden pattern in `app.scss`, `chat.scss` and `iframe-runtime.scss` to the new `visually-hidden` mixin in `vars.scss`, which this change's two rules use.
- `SinglePageContent` renders hidden sections while the planner walks visible sections only. The mismatch predates this work and no built-in sample hits it, so it is left for a separate fix.
- `Section.renderCollapsibleHeader` keeps its own list of layouts with the collapsible column on the left, which disagrees with `getSectionColumns` for `responsive-2-column` and `responsive`. It only sets the arrow direction and predates this work; folding it in would change behavior.

## Decisions

**Requirements decisions**

### Does a gating item's reach end at the page or at its section?
**Context**: Placement is how authors choose which questions depend on the model; in the notebook layout sections are tabs.
**Options considered**:
- A) To the end of the page.
- B) To the end of the gating item's section.
- C) Both, with a second URL parameter.

**Decision**: A by default (Doug Martin, 2026-10-06). After the PIs reviewed the demo (Trudi Lord, 2026-10-07), authors also get "only this section" as a third `question_gating` value, `"disable_following_in_section"`, limited to the gating item's own section because an authored link to another section would break when items move or sections are deleted. The enum absorbed it with no new field.

---

### What shape does the LARA authoring setting take?
**Context**: The setting is a contract between LARA-226, the activity JSON and the Activity Player, and the feature is expected to grow.
**Options considered**:
- A) A boolean "questions after this item start disabled".
- B) A string enum whose key names the feature and whose values name behaviors.

**Decision**: B (Doug Martin, 2026-10-06): optional `question_gating`, `"none"` by default and for a missing field, and `"disable_following_on_page"`. New behaviors are new values.

---

### Where do the banner text and image come from once the feature is generic?
**Context**: The demo hardcodes the Hazbot wording.
**Options considered**:
- A) Authored per item in LARA.
- B) Sent by the interactive in the unlock protocol.
- C) Generic Activity Player wording with no image.

**Decision**: A for the text (Doug Martin, 2026-10-06), with Activity Player defaults when empty. No authored image, since LARA has no image upload; the banner uses a block icon and a check.

---

### What stands in for the Wildfire unlock message?
**Options considered**:
- A) The gating item's saved interactive state.
- B) A demo-only "Unlock" button.
- C) A `customMessage` from the interactive.

**Decision**: A. Reviewers get the real flow with no Wildfire change, because the model saves state once per completed run. B shows the transition but not the trigger; C needs a Wildfire change. Checked against Wildfire master: only the end of a started run saves.

---

### What does "after" mean in a split-layout section?
**Context**: Authored order and question-numbering order disagree in layouts that put the secondary column on the left, and a model pinned in the right column sits beside questions scrolling on the left.
**Options considered**:
- A) Authored order.
- B) Numbering order, left column then right.
- C) The other column counts as after the gate; within the gate's own column, order applies.
- D) The gate's whole section.

**Decision**: C (Doug Martin, 2026-10-07), replacing B. Under B a right-pinned model locked none of the questions beside it (Scott Cytacki's question during PI review). Comparing positions across columns would depend on heights that change as the page reflows, so the whole other column counts as after. D would also lock questions above the model in a full-width section, which nobody asked for.

---

### What colors does the banner use?
**Context**: The first demo used light gray; Trudi Lord asked for green when unlocked, and Michael Tirenin's earlier Zeplin design had a blue banner.

**Decision**: Michael's colors (2026-10-07): blue `#C1DAFF` when locked and green `#63D199` when unlocked, with `#222` Lato 20px bold text. Both pass AA with room to spare. A lock icon was avoided because the multiple-choice interactive already uses one for answers that cannot change.

---

### Does a page that loads already unlocked show the unlocked banner?
**Options considered**:
- A) No banner.
- B) Always show the unlocked banner once unlocked.

**Decision**: A. "The questions are now unlocked!" announces a change the student just caused; a return visit has none.

---

### Are questions disabled in Teacher Edition, or on a locked offering?
**Options considered**:
- A) No.
- B) Yes, so teachers see what students see.

**Decision**: A for both. Teacher Edition is how teachers inspect content, and plain `preview` still shows the student view. A locked offering saves no state, so its banner could never clear.

---

### What does a disabled question expose to assistive technology?
**Context**: Making the whole question inert would hide its heading from heading navigation while sighted students still see it.
**Options considered**:
- A) Inert on the whole question.
- B) Heading readable and marked locked; everything else inert.

**Decision**: B. A question with no header has no heading for anyone, and the banner explains the lock.

---

### How do notebook tabs explain locked questions on later tabs?
**Context**: Only one tab shows at a time, so a banner before the first disabled question is off screen once the student switches tabs.
**Options considered**:
- A) A banner before the first disabled question in each later tab.
- B) Accept for the demo and note it.
- C) A banner in every later section in every layout.

**Decision**: A variant of A (Doug Martin, 2026-10-07): a full-width banner under the tabs on each later tab the gate reaches, tried in the running app first. A gating item inside a tab that already shows a tab banner joins it, so no tab shows two banners and no tab says "unlocked" above a locked question.

---

### What happens to the URL parameter after LARA-226?
**Options considered**:
- A) The later pull request removes it.
- B) It stays as a development override on top of the authored field.

**Decision**: B (Doug Martin, 2026-10-07), renamed `override:disableQuestionsAfter` from this pull request on so review links keep working, in the family with `override:locked`.

---

**Implementation decisions**

### What does the page show while a gate's saved state is loading?
**Options considered**:
- A) Disabled but not grayed, no banner.
- B) The full locked state, then a silent unlock.
- C) Usable until the state arrives.

**Decision**: A. B flashes the locked state at a returning student; C lets a fast click through.

---

### Where does the banner go?
**Context**: `.section` is a 10-column grid, so a banner rendered as a sibling of the question took one column (89px beside a 984px question).
**Options considered**:
- A) A sibling of the question with `grid-column: 1 / -1`.
- B) Inside the question's cell.

**Decision**: B (Doug Martin, 2026-10-07), after measuring both on 15 sample activities at 1280px and 760px. A broke every half-width pair; B matched the question's width everywhere. The primary-column max-aspect-ratio cell became a flex column so the banner does not push the interactive out of the cell, and a taller cell re-measures visibility through the existing `ResizeObserver`.

---

### Inert inside each component, or one wrapper around the question body?
**Options considered**:
- A) `inert` on the iframe runtime and click-to-play roots, native `disabled` on the hint button.
- B) A new wrapper made inert.

**Decision**: A. A new wrapper would change the structure every interactive renders through. A throwaway Playwright check confirmed `inert` keeps Tab and clicks out of a cross-origin iframe in Chromium and Firefox.

---

### Where does the plan live?
**Options considered**:
- A) A new `src/utilities/disabled-questions.ts`.
- B) `page-walk.ts`.

**Decision**: A. `page-walk.ts` must stay importable by the report-service copy of `chat-context.ts`.

---

### How are single-page activities covered?
**Context**: `SinglePageContent` renders each page's sections itself, so a provider in `ActivityPageContent` alone left the feature off there.

**Decision**: One provider per authored page (Doug Martin, 2026-10-06), with an end-to-end test that fails if the providers are missing or merged into one.

---

### How are repeated parameters and parameter-free pages handled?
**Decision**: A repeated parameter is caught, warned about, and ignored, since `queryValue` throws during render and the app has no error boundary. With no gating items the provider sets no state, so pages without the parameter render once, as before.

---

### Where are unlocks announced?
**Context**: In a notebook, a gate whose questions are all on later tabs has every banner in a hidden tab, so a live-region banner announced nothing while the student stayed on the gate's tab.
**Options considered**:
- A) Keep each banner a live region and mirror the update into the selected tab.
- B) One live region per page, outside the tabs, with the banners as plain text.

**Decision**: B. It announces each unlock once wherever the banners are, including a collapsed column, and keeps tab state out of the provider.

---

### How do the page-level tests drive the feature?
**Context**: The gate's own `ManagedInteractive` and the provider both watch the same answer, and a question shows "Loading..." until its own answer arrives.

**Decision**: A shared mock, `src/test-utils/answer-watchers.ts`, keeps every subscriber per ref id and reports to all of them. The tests report to the gate and each question, and fail if the provider is not wired in.
