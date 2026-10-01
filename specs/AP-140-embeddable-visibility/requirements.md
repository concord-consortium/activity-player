# Log Which Embeddables Are Visible on the Page

**Jira**: https://concord-consortium.atlassian.net/browse/AP-140
**Repo**: https://github.com/concord-consortium/activity-player
**Implementation Spec**: [implementation.md](implementation.md)
**Status**: **In Development**

## Overview

The Activity Player will log an `EMBEDDABLE_VISIBILITY_CHANGE` event each time the view settles after a scroll, resize, page change or layout change, listing every embeddable on screen and how much of it is showing. The event mirrors CLUE's `TILE_VISIBILITY_CHANGE` so researchers can study passive viewing the same way in both products.

## Project Owner Overview

Researchers can see what students click and type in the Activity Player, but not what they look at. The only visibility signal today comes from the question interactives, which each log "scrolled into view" and "scrolled out of view" from inside their own iframe. Instruction text, simulations (MwInteractive) and other non-question content log nothing, and the existing events do not say how much of an interactive is showing, so a researcher cannot tell whether a student read the instructions or had the simulation on screen while answering.

This story adds one page-level event that answers "what could the student see, and how much of it" after each scroll or layout change settles. It is shaped like the event CLUE added in CLUE-629, which Scott asked for so researchers moving between AP and CLUE see matching data. It was requested by Sam G. (section 4 of the "Log Events Request" doc) and replaces WM-65, which had scoped the same idea to the Wildfire model only.

## Background

**The request.** Sam's "Log Events Request" doc (section 4, https://docs.google.com/document/d/1daS5sXXYLckI_DkZyuzbirgyPmAEKkWz_EULEa_M7lA) asks for passive-viewing logs for every embeddable on a page, instruction and text blocks included, like CLUE's `TILE_VISIBILITY_CHANGE`. Jira is the authoritative scope; it names the event, its fields and the 500ms settle.

**What exists today.** AP itself logs no visibility events. The `scrolled into view` / `scrolled out of view` / `focus in` / `focus out` events in AP logs come from question-interactives' `useBasicLogging` hook running inside each ManagedInteractive iframe (an `IntersectionObserver` on its own body at an 80% threshold after a 6s delay). They reach the AP log through `iframe-runtime.tsx` `addListener("log")` → `managed-interactive.tsx` `handleLog` → `Logger.log`, which stamps `interactive_id` / `interactive_url`. MwInteractive simulations, text blocks and plugins get nothing. `LogEventName.iframe_interaction` is declared but never logged.

**The template.** CLUE-629 (collaborative-learning `src/components/document/tile-visibility.ts` and `document-content.tsx`) measures each tile's box against the scroll container's vertical bounds, reports each tile with any overlap as a whole percent from 1 to 100, and logs one event 500ms after the last trigger (trailing debounce). A `scroll` never displaces a pending layout cause. Events with no visible tile are not logged. On unmount, a pending scroll snapshot is flushed and a pending layout snapshot is dropped. Params: `cause`, `viewportHeight`, `tileCount`, `visibleTiles` (`tileId`, `tileType`, `tileTitle`, `percentVisible`, optional `containerId`).

**How AP lays out a page (verified in the running app, 2026-10-01).**
- The page scrolls inside `#app` (`position: fixed; overflow: auto`, `app.scss`), not the window: scrolling `#app` fires no bubbling `scroll` on `window`, but a capture-phase listener on `window` or `document` sees it. With `?logMonitor=true` the scroller becomes `.app` instead (`#app:has(.log-monitor)` rule), and it does not fit the window: measured `.app` 969px tall (952px client height) in an 889px window, with `#app` itself scrolling the 80px difference. So the scroller's own box is not the viewport in that mode.
- Split layouts can pin the primary column (`.embeddableWrapper.pinned { position: sticky }`, `section.tsx` / `section.scss`). Measured on `sample-activity-multiple-layout-types` page 7: after scrolling 900px the primary column's first interactive stays at `top=10` while the secondary column moves, so `getBoundingClientRect` reports sticky content correctly.
- Interactive heights keep changing after the page renders as each iframe reports its height (`iframe-runtime.tsx` `addListener("height")`). On page 7 one interactive went from 566px to 187px and another from 358px to 218px between two measurements taken 3s apart and after load.
- Notebook layout hides non-selected section tabs with `visibility: hidden; height: 0` (`notebook.scss` `.hidden-tab`), but the embeddables inside keep their real heights (measured: 367px to 580px tall at `top=-8943`). They are off screen only by accident of overflow, so they must be excluded explicitly rather than by geometry.
- A collapsed secondary column does not render its embeddables at all (`section.tsx` renders the panel contents only when `!isSecondaryCollapsed`). Hidden embeddables (`is_hidden`) render with `display: none`; windowShade plugins render only in teacher edition.
- The page sidebar ("Did you know?"), the glossary/expandable container, the chat drawer and the modal dialog are all `position: fixed` overlays. Opening them does not move or resize any embeddable.
- The rendered embeddable element (`embeddable.tsx`, `data-cy="embeddable"`) carries no id today, so a DOM measurement cannot be tied back to an embeddable without adding one.
- Page changes remount `ActivityPageContent` (`key={page-N}`); single-page layout renders every page's sections in one `SinglePageContent`. While idle or errored, the page content is not rendered.
- Embeddable `ref_id`s are `<id>-<Type>`, e.g. `10199-ManagedInteractive`, `123-MwInteractive`, `456-Embeddable::Xhtml`, and are unique within an activity.

**Where events go.** `Logger.log` sends to the logging service and, through `LARA.Events.emitLog` → `onLog`, to AP's log monitor (`?logMonitor=true`). Every message already carries `activity`, `activityPage`, `sequence`, `sequenceActivityIndex`, `session`, `username`, `role` and `time`, so page identity does not need repeating in the parameters. Logs reach the page chat only through `managed-interactive.tsx` `handleLog` (`forwardInteractiveLog`), so an event logged from AP's own code is never forwarded to the tutor.

## Requirements

### The event

- AP logs an event named `EMBEDDABLE_VISIBILITY_CHANGE` through `Logger.log`, with its fields in `parameters`.
- `parameters` holds:
  - `cause`: one of the causes below.
  - `viewportHeight`: the height of the viewport in CSS pixels, a whole number. The viewport is the scroll container's box clipped to the browser window, so the part of `.app` below the window in log-monitor mode does not count as visible.
  - `embeddableCount`: the number of measurable embeddables on the current view (see "Which embeddables count").
  - `visibleEmbeddables`: one entry per measurable embeddable with any vertical overlap with the viewport, in document order (sections in order; within a split section, the left column's embeddables before the right column's, which is not the visual top-to-bottom order), each with:
    - `embeddableId`: the embeddable's `ref_id`, e.g. `10199-ManagedInteractive`. Its suffix after the first hyphen is the embeddable's authored `type` (`ManagedInteractive`, `MwInteractive`, `Embeddable::Xhtml`, `Embeddable::EmbeddablePlugin`, `Embeddable::SpikeMediaLibrary`), so the type is not logged separately.
    - `embeddableTitle`: the embeddable's trimmed `name`, or `""` when it has none.
    - `questionNumber`: the number the embeddable's header shows as "Question #N", present only when the header shows one. It is absent for text blocks and other non-questions, for an interactive whose author hid its number, and for every item when the activity or sequence hides question numbers. It is the same number the student sees, counted across earlier pages, in every layout including notebook.
    - `percentVisible`: the share of the embeddable's height inside the viewport, rounded to a whole percent and clamped to 1 to 100, so any positive overlap counts as visible.
- An embeddable with zero overlap, or zero height, is omitted from `visibleEmbeddables`.
- `percentVisible` is a share of the embeddable, not of the screen: an embeddable taller than the viewport can never reach 100 (a 2000px text block in an 889px viewport tops out at 44). Researchers reading "fully seen" from the data have to account for this, as in CLUE.
- The event is logged for every user the Logger is initialized for (students, teachers, teacher edition, anonymous); the existing `role` and `appMode` fields distinguish them.

### Which embeddables count

- An embeddable is measurable when it is rendered on the current view and visible to the user: not `is_hidden`, not in a collapsed secondary column, not in a non-selected notebook tab, and not otherwise rendered as `null` (for example a windowShade plugin outside teacher edition).
- Single-page layout counts every embeddable on the one long page.
- Only embeddables inside the page content count. Activity-level plugins, the sidebar, the glossary and the chat drawer are not embeddables.

### Causes and settling

- `cause` is one of:
  - `scroll`: the page's scroll container scrolled.
  - `windowResize`: the browser window resized.
  - `pageChange`: a content page is shown: initial load, page navigation, a sequence activity change, or the page reappearing after the idle or error screen.
  - `tabChange`: a different notebook section tab was selected.
  - `columnToggle`: a collapsible secondary column was hidden or shown.
  - `embeddableResize`: an embeddable's rendered height changed (an interactive reporting a new height, an image loading, a font change).
  - `pageHidden`: the browser tab became hidden (`document.visibilityState` is `hidden`).
  - `pageVisible`: the browser tab became visible again.
- Triggers are coalesced with a trailing debounce: one event is logged 500ms after the last trigger, measuring the view at that moment.
- When triggers coalesce, the reported cause is decided by rank: `embeddableResize` is lowest, `scroll` next, and every other cause highest. An incoming cause replaces the pending one when its rank is equal or higher, so the newest cause wins within a rank. Resizes follow scrolls and layout changes (interactives lazy-load and report new heights as they come into view), and scrolls follow layout changes (the container clamps its scroll position as the page reflows), so the lower-ranked cause is a side effect of the higher one.
- An `embeddableResize` snapshot whose `visibleEmbeddables` is identical to the last logged one is not logged.
- No event is logged when no embeddable is visible, except `pageHidden`.
- `pageHidden` is logged immediately rather than debounced, with `visibleEmbeddables: []`, because timers in a hidden tab are throttled. It is logged only when a non-empty snapshot has been logged since the last `pageHidden`, since it closes a reported view. Any pending snapshot is logged first, measured at that moment, so the view the student left is recorded before the hidden event.
- `pageVisible` is debounced like the other causes and reports what is on screen when the student returns.
- When the page content unmounts (page change, idle, error), a pending `scroll` snapshot is logged immediately, measured before teardown; any other pending cause is dropped, since the next view reports its own `pageChange`.

### Behavior that stays the same

- Existing log events, including the question interactives' `scrolled into view` / `scrolled out of view` / `focus in` / `focus out`, are unchanged.
- Logging adds no visible UI and does not change layout.

## Technical Notes

- **Files involved.** `src/lib/logger.ts` (`LogEventName`), `src/components/activity-page/activity-page-content.tsx` and `src/components/single-page/single-page-content.tsx` (the two page roots), `section.tsx` (column collapse, and the `hiddenTab` prop that notebook tab selection drives), `embeddable.tsx` (the element to measure). CLUE's `tile-visibility.ts` is the model for keeping the math and params assembly in pure, unit-tested helpers.
- **Event naming.** AP's `LogEventName` members are lower snake case (`toggle_sidebar`) and are logged by their member name, so adding `EMBEDDABLE_VISIBILITY_CHANGE` as a member logs exactly that string.
- **Scroll container.** Listening on `#app` alone misses the `?logMonitor=true` case, where `.app` scrolls. A capture-phase `scroll` listener on `document` sees both but also sees scrolls inside the chat, sidebar panel, glossary and any other inner scroller, so it has to filter by target.
- **Measuring.** Vertical extent only, like CLUE: `top`/`bottom`/`height` from `getBoundingClientRect` against the viewport's top and bottom (the scroll container's rect clipped to `0` and `window.innerHeight`). Horizontal position is ignored.
- **Question numbers.** `Section` numbers only embeddables that `isQuestion` (`page-walk.ts`) accepts: interactives with learner state whose item-level `hide_question_number` / `custom_hide_question_number` is off. It passes `questionNumber` to `Embeddable`, and `ManagedInteractive` hands its header `hideQuestionNumbers ? undefined : questionNumber`, where `hideQuestionNumbers` is the activity or sequence setting (`app.tsx`). The header renders `Question #${questionNumber}` when that is set.
- **Ordering at page change.** `handleChangePage`'s `navigateAway` calls `setState({ currentPage })` from a promise callback; under React 16 that renders synchronously, so the old page unmounts (and flushes a pending scroll snapshot) before `Logger.updateActivityPage(page)` runs. The flushed snapshot therefore carries the old `activityPage`, which is the page it describes. Verified with a throwaway Jest test under React 16.14: a class component's `componentWillUnmount` and a function component's effect cleanup both ran with their DOM still attached, before the statement following `setState`.
- **Delivery.** `Logger.log` posts with an asynchronous `XMLHttpRequest`. A `pageHidden` event caused by closing the tab or navigating away can be canceled with the page, the same as any other event logged at unload, so its absence does not prove the student stayed.
- **Not forwarded to the chat.** Logs reach the page chat only through `managed-interactive.tsx` `handleLog` (`forwardInteractiveLog`); this event is logged directly through `Logger.log`, so the tutor never sees it.
- **`pageChange` after idle or error depends on `app.tsx`.** `renderActivity` renders the page content only when `!idle && !errorType`, so the page root unmounts behind the idle and error screens and remounts after them, and remounting is what logs `pageChange`. A change that keeps the page mounted behind those screens would silently drop this cause and log snapshots of a page the student cannot see.
- **No `ResizeObserver`, no `embeddableResize`.** The tracker feature-detects `window.ResizeObserver` and skips resize triggers without it. Every supported browser has it; the check exists because jsdom does not, and the existing page tests render page roots without installing a fake.
- **Volume.** At most one event per 500ms of quiet; a long continuous scroll produces one event at its end.

## Out of Scope

- **Retiring the question interactives' scroll events.** They are logged by question-interactives, not AP, so retiring them is a question-interactives change. They stay until researchers have validated the new event; a follow-up story in that repo can remove them.
- **Occlusion by overlays.** Visibility is geometric. The sidebar, glossary, chat drawer, modal dialog and idle warning cover content without moving it, and are not subtracted.
- **Horizontal visibility.** An embeddable is measured on its vertical extent, as in CLUE.
- **Content inside an embeddable.** What part of an interactive's own document is scrolled into view inside its iframe is not measured.
- **The sequence introduction, activity introduction (page 0) and completion pages.** They contain no section embeddables.
- **Focus moving between embeddables.** A separate event with its own design (AP sees only the window blur and `document.activeElement`); a follow-up story if researchers want it. The question interactives' `focus in` / `focus out` continue to cover questions.
- **Overlays as causes.** Opening the sidebar, glossary, chat drawer or modal does not move any embeddable, so a snapshot would repeat the previous one; their opening is already logged (`toggle_sidebar`, `toggle_modal_dialog`).
- **Nested containers.** AP has no container embeddables, so CLUE's `containerId` has no counterpart.
- **Per-item page and section fields.** Every record already carries `activityPage`. A per-item page ID would add information only in single-page layout, and sections have no authored ID, only a position, so neither is logged.

## Open Questions

### RESOLVED: Which question number to log
**Context**: Requested after the first draft. AP computes a question number for every numbered question, but the header does not always display it.
**Options considered**:
- A) The number the header displays, absent when none is displayed
- B) The computed number whenever one exists, including when the activity hides numbers

**Decision**: A, as requested: the field records what the student sees on the item. It is derived from the same helper the header uses, so the two cannot drift apart.

### RESOLVED: Judgment call: what the per-embeddable fields are named
**Context**: Jira lists "id, type and percentVisible"; CLUE uses `tileId`, `tileType`, `tileTitle`, `percentVisible`.
**Options considered**:
- A) `embeddableId`, `embeddableTitle`, `percentVisible`, mirroring CLUE's names with the AP noun
- B) `id`, `type`, `percentVisible` as Jira words it

**Decision**: A. The point of the story is that researchers moving between products see matching events, so the field names follow CLUE's, title included; `embeddableCount` / `visibleEmbeddables` already follow that pattern in the Jira text.

### RESOLVED: Whether to log the embeddable's type
**Context**: Jira and CLUE (`tileType`) both include a type. In AP the type is already the suffix of every `ref_id`: all 1,394 embeddables in the repo's sample activities end in exactly their `type`. The type also says little, since nearly every question and simulation is `ManagedInteractive` and every text block `Embeddable::Xhtml`.
**Options considered**:
- A) Do not log it; researchers read it from `embeddableId`
- B) Log `embeddableType` alongside the id, as CLUE does
- C) Log the library interactive's name (e.g. "Multiple Choice (master)") as a more descriptive kind

**Decision**: A, decided after the first draft. B repeats a value already in each entry, and CLUE needs `tileType` only because its tile ids do not carry the type. C is more informative but is an authoring-library name with branch suffixes; it can be added if researchers ask for it.

### RESOLVED: Judgment call: whether `embeddableResize` is a cause
**Context**: CLUE has `tileResize` for a user dragging a row, but AP interactives resize themselves after load (measured: 566px to 187px).
**Options considered**:
- A) Make it a cause that never displaces a layout cause, and skip it when the snapshot is unchanged
- B) Not a cause: only user-driven triggers log

**Decision**: A. Without it, the `pageChange` snapshot taken 500ms after load can describe heights that are gone a second later, and a student watching an interactive grow would never get a corrected event. Suppressing unchanged snapshots keeps self-resizing interactives from adding noise.

### RESOLVED: Judgment call: what counts toward `embeddableCount`
**Context**: CLUE counts every tile rendered in the document. AP renders hidden notebook tabs with real heights.
**Options considered**:
- A) Only measurable embeddables on the current view (excludes hidden tabs, collapsed columns, `is_hidden`)
- B) Every embeddable on the authored page

**Decision**: A. The count is the denominator a researcher divides by ("saw 3 of 7"); counting content the student cannot reach without a tab click or column toggle inflates it.

### RESOLVED: Low confidence: whether opening an overlay should be a cause
**Context**: Jira names "the sidebar" as an example layout change. In AP the sidebar, glossary, chat drawer and modal are fixed overlays that do not move embeddables (verified), so a snapshot on open would be identical to the one before, and occlusion is out of scope. Their opening is already logged (`toggle_sidebar`, `toggle_modal_dialog`).
**Options considered**:
- A) Not causes; researchers join on the existing toggle events
- B) Log a snapshot with a `sidebarToggle` / `dialogToggle` cause anyway, matching Jira's wording
- C) Compute occlusion so an overlay reduces `percentVisible`

**Decision**: A. Verified in the running app that all four are `position: fixed` and leave every embeddable's box unchanged, so B would log a duplicate of the previous snapshot. Jira's intent, a snapshot after anything that changes the layout, is met by the causes that do change it. C is out of scope: the overlays cover content horizontally, which a vertical-only percentage cannot express.

### RESOLVED: Low confidence: whether to log the tab being hidden
**Context**: Jira leaves this to the spec. Without it, a researcher computing dwell time from successive events counts time the student spent in another browser tab as viewing.
**Options considered**:
- A) Log an event with cause `pageHidden` and empty `visibleEmbeddables` when `document.visibilityState` becomes `hidden`, logged immediately rather than debounced, and a `pageVisible` snapshot when it returns
- B) Leave it out, as CLUE does

**Decision**: A. Each event describes a view that lasts until the next one, so without a hidden marker the last snapshot before a tab switch silently claims all the time away. The causes are additive, so events still match CLUE's shape. The idle detector already listens to the same event (`idle-detector.ts`), so the browser support is established. Logged immediately because a hidden tab throttles timers and could delay a debounced event until the student returns.

### RESOLVED: Low confidence: whether to log focus moving between embeddables
**Context**: Jira leaves this to the spec. AP can see the window blur when an iframe takes focus and read `document.activeElement`; the question interactives already log `focus in` / `focus out` from inside their iframes, but MwInteractive and text blocks do not.
**Options considered**:
- A) Out of scope for AP-140; a follow-up story if researchers want it
- B) Add an `EMBEDDABLE_FOCUS_CHANGE` event in this story

**Decision**: A. It is a different question (where input goes, not what is seen), CLUE has no counterpart, and the story is sized as WM-65's replacement. Questions already log focus from inside their iframes.

## Self-Review

Roles: Senior Engineer, Education Researcher, QA Engineer. Each finding below was checked against the code or the running app before being recorded.

### Senior Engineer

#### RESOLVED: A pending `embeddableResize` blocked a later `scroll` from becoming the cause
The draft said `scroll` and `embeddableResize` "never displace a pending cause of another kind", which also stopped a scroll from displacing a pending resize. Verified on `sample-activity-multiple-layout-types` page 7: scrolling 1000px made five interactives resize within 420ms of the scroll (they lazy-load as they come into view), so resize and scroll triggers interleave in practice and a student's scroll could be reported as `embeddableResize`. Fixed by ranking the causes (`embeddableResize` < `scroll` < the rest) in "Causes and settling".

---

### Education Researcher

#### RESOLVED: `percentVisible` cannot reach 100 for embeddables taller than the viewport
By construction the percentage is overlap divided by the embeddable's own height, and the sample pages include interactives 857px tall in an 889px viewport, so a longer text block or a tall simulation reads as partly seen even when it fills the screen. Not a change to the shape (CLUE behaves the same); documented under "The event" so the data is not misread.

---

### QA Engineer

#### RESOLVED: "Page order" was ambiguous for split layouts
`section.tsx` renders the left column's embeddables, then the right column's, so DOM order differs from visual top-to-bottom order, and a test asserting the entry order needs one definition. Fixed by defining the order as document order, with the split-column case spelled out.

#### RESOLVED: `pageHidden` on tab close may never arrive
`sendToLoggingService` in `logger.ts` uses an asynchronous `XMLHttpRequest`, which the browser may cancel when the page unloads. Closing the tab fires `visibilitychange` first, so the event is attempted, but delivery is not guaranteed. Recorded under Technical Notes as a limitation shared with every unload-time event, rather than switching transports for one event.

### Implementation assumptions verified before planning

#### RESOLVED: The scroll container's box is not the viewport in log-monitor mode
Ran in the browser with `?logMonitor=true`: `.app` is 969px tall in an 889px window, so measuring against its rect would count 80px below the window as visible. The viewport is now the container's rect clipped to the window (Requirements, `viewportHeight`; Technical Notes, Measuring). Also confirmed there that a capture-phase `scroll` listener on `document` reports `.app` as the target.
