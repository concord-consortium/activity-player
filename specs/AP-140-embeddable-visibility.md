# Log Which Embeddables Are Visible on the Page

**Jira**: https://concord-consortium.atlassian.net/browse/AP-140

**Status**: **Closed**

## Overview

The Activity Player logs an `EMBEDDABLE_VISIBILITY_CHANGE` event each time the view settles after a scroll, resize, page change or layout change, listing every embeddable on screen and how much of it is showing. The event mirrors CLUE's `TILE_VISIBILITY_CHANGE` (CLUE-629) so researchers can study passive viewing the same way in both products.

Before this, the only visibility signal came from the question interactives, which each log "scrolled into view" and "scrolled out of view" from inside their own iframe. Instruction text, simulations (MwInteractive) and other non-question content logged nothing, and the existing events did not say how much of an interactive was showing. It was requested by Sam G. (section 4 of the "Log Events Request" doc) and replaces WM-65, which had scoped the same idea to the Wildfire model only.

## Requirements

### The event

- AP logs an event named `EMBEDDABLE_VISIBILITY_CHANGE` through `Logger.log`, with its fields in `parameters`.
- `parameters` holds:
  - `cause`: one of the causes below.
  - `viewportHeight`: the height of the viewport in CSS pixels, a whole number. The viewport is the scroll container's box clipped to the browser window, so the part of `.app` below the window in log-monitor mode does not count as visible.
  - `embeddableCount`: the number of measurable embeddables on the current view (see "Which embeddables count").
  - `visibleEmbeddables`: one entry per measurable embeddable with any vertical overlap with the viewport, in document order (sections in order; within a split section, the left column's embeddables before the right column's, which is not the visual top-to-bottom order), each with:
    - `embeddableId`: the embeddable's `ref_id`, e.g. `10199-ManagedInteractive`. Its suffix after the first hyphen is the embeddable's authored `type`, so the type is not logged separately.
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
- Triggers are coalesced with a trailing debounce: one event is logged 500ms after the last trigger, measuring the view at that moment. The wait is capped at 2000ms after the first trigger of a burst, so triggers that keep arriving (an interactive animating its height) cannot postpone the event indefinitely.
- When triggers coalesce, the reported cause is decided by rank: `embeddableResize` is lowest, `scroll` next, and every other cause highest. An incoming cause replaces the pending one when its rank is equal or higher, so the newest cause wins within a rank.
- An `embeddableResize` snapshot whose `visibleEmbeddables` is identical to the last logged one is not logged.
- No event is logged when no embeddable is visible, except `pageHidden`.
- `pageHidden` is logged immediately rather than debounced, with `visibleEmbeddables: []`, because timers in a hidden tab are throttled. It is logged only when a non-empty snapshot has been logged since the last `pageHidden`, since it closes a reported view. Any pending snapshot is logged first, measured at that moment, so the view the student left is recorded before the hidden event.
- `pageVisible` is debounced like the other causes and reports what is on screen when the student returns.
- When the page content unmounts (page change, idle, error), a pending `scroll` snapshot is logged immediately, measured before teardown; any other pending cause is dropped, since the next view reports its own `pageChange`.

### Behavior that stays the same

- Existing log events, including the question interactives' `scrolled into view` / `scrolled out of view` / `focus in` / `focus out`, are unchanged.
- Logging adds no visible UI and does not change layout.

## Technical Notes

- **Structure.** Three layers: pure helpers (`src/utilities/embeddable-visibility.ts`) for the vertical-percent math, viewport clip, cause ranking, snapshot comparison and params; a framework-free tracker (`src/utilities/embeddable-visibility-tracker.ts`) that owns the debounce, the capture-phase `scroll`, `resize` and `visibilitychange` listeners and a `ResizeObserver`; and the React wiring. `EmbeddableVisibilityProvider` creates one tracker per mounted page root (`ActivityPageContent` and `SinglePageContent`), each `Embeddable` registers its outer element through `EmbeddableVisibilityContext`, and `Section` queues `columnToggle` and `tabChange`.
- **Event naming.** `LogEventName.EMBEDDABLE_VISIBILITY_CHANGE` is logged by its member name, so the event string is exactly `EMBEDDABLE_VISIBILITY_CHANGE`.
- **Scroll container.** The page scrolls inside `#app`, or `.app` with `?logMonitor=true`, and neither fires a bubbling `scroll` on `window`. A capture-phase listener on `document` sees both, and also sees scrolls inside the chat, sidebar and glossary, so it filters to targets that are `document` or contain a registered embeddable.
- **Measuring.** Vertical extent only, like CLUE: `top`/`bottom`/`height` from `getBoundingClientRect` against the scroll container's rect clipped to `0` and `window.innerHeight`. Sticky (pinned) primary columns report correctly through `getBoundingClientRect`.
- **Hidden notebook tabs.** Non-selected tabs (`.hidden-tab`) keep their embeddables mounted at full height, so they are excluded explicitly at measure time rather than by geometry. Collapsed secondary columns and `null`-rendered types never mount, so they never register.
- **Question numbers.** The number the header shows and the number logged both come from `displayedQuestionNumber` in `activity-utils.ts`, so they cannot drift apart. `Section` passes a number only for embeddables that `isQuestion` accepts.
- **Ordering at page change.** Under React 16, `setState({ currentPage })` from the navigation promise renders synchronously, so the old page unmounts and flushes a pending scroll before `Logger.updateActivityPage(page)` runs; the flushed snapshot carries the old `activityPage`. Children's effects run before the provider's, so every embeddable is registered before `start()` queues `pageChange`, and the provider's cleanup runs first on unmount, with every element still attached.
- **`pageChange` after idle or error depends on `app.tsx`.** `renderActivity` renders the page content only when `!idle && !errorType`, so the page root remounts after those screens. A change that kept the page mounted behind them would silently drop this cause.
- **Delivery.** `Logger.log` posts with an asynchronous `XMLHttpRequest`, so a `pageHidden` caused by closing the tab can be canceled with the page, like any unload-time event.
- **Not forwarded to the chat.** Logs reach the page chat only through `managed-interactive.tsx` `handleLog`; this event is logged directly through `Logger.log`, so the tutor never sees it.
- **No `ResizeObserver`, no `embeddableResize`.** The tracker feature-detects `window.ResizeObserver`; every supported browser has it, and the check exists for jsdom.
- **Volume.** At most one event per 500ms of quiet, plus one every 2000ms during a continuous burst; a scroll shorter than 2000ms produces one event at its end. A page load typically logs `pageChange` followed by one or two `embeddableResize` corrections as interactives settle their heights.

## Out of Scope

- **Retiring the question interactives' scroll events.** They are logged by question-interactives, not AP; a follow-up story in that repo can remove them once researchers have validated the new event.
- **Occlusion by overlays.** Visibility is geometric. The sidebar, glossary, chat drawer, modal dialog and idle warning cover content without moving it, and are not subtracted.
- **Horizontal visibility.** An embeddable is measured on its vertical extent, as in CLUE.
- **Content inside an embeddable.** What part of an interactive's own document is scrolled into view inside its iframe is not measured.
- **The sequence introduction, activity introduction (page 0) and completion pages.** They contain no section embeddables.
- **Focus moving between embeddables.** A separate event with its own design; a follow-up story if researchers want it.
- **Overlays as causes.** Opening the sidebar, glossary, chat drawer or modal does not move any embeddable; their opening is already logged (`toggle_sidebar`, `toggle_modal_dialog`).
- **Nested containers.** AP has no container embeddables, so CLUE's `containerId` has no counterpart.
- **Per-item page and section fields.** Every record already carries `activityPage`, and sections have no authored ID, so neither is logged per item.

## Decisions

### Which question number to log
**Context**: AP computes a question number for every numbered question, but the header does not always display it.
**Options considered**:
- A) The number the header displays, absent when none is displayed
- B) The computed number whenever one exists, including when the activity hides numbers

**Decision**: A: the field records what the student sees on the item. It is derived from the same helper the header uses, so the two cannot drift apart.

---

### What the per-embeddable fields are named
**Context**: Jira lists "id, type and percentVisible"; CLUE uses `tileId`, `tileType`, `tileTitle`, `percentVisible`.
**Options considered**:
- A) `embeddableId`, `embeddableTitle`, `percentVisible`, mirroring CLUE's names with the AP noun
- B) `id`, `type`, `percentVisible` as Jira words it

**Decision**: A. Researchers moving between products should see matching events, so the field names follow CLUE's, title included; `embeddableCount` / `visibleEmbeddables` already follow that pattern in the Jira text.

---

### Whether to log the embeddable's type
**Context**: Jira and CLUE (`tileType`) both include a type. In AP the type is already the suffix of every `ref_id` (all 1,394 embeddables in the repo's sample activities end in exactly their `type`), and nearly every question and simulation is `ManagedInteractive` and every text block `Embeddable::Xhtml`.
**Options considered**:
- A) Do not log it; researchers read it from `embeddableId`
- B) Log `embeddableType` alongside the id, as CLUE does
- C) Log the library interactive's name (e.g. "Multiple Choice (master)") as a more descriptive kind

**Decision**: A. B repeats a value already in each entry, and CLUE needs `tileType` only because its tile ids do not carry the type. C is an authoring-library name with branch suffixes; it can be added if researchers ask for it.

---

### Whether `embeddableResize` is a cause
**Context**: CLUE has `tileResize` for a user dragging a row, but AP interactives resize themselves after load (measured: 566px to 187px).
**Options considered**:
- A) Make it a cause that never displaces a layout cause, and skip it when the snapshot is unchanged
- B) Not a cause: only user-driven triggers log

**Decision**: A. Without it, the `pageChange` snapshot taken 500ms after load can describe heights that are gone a second later. Suppressing unchanged snapshots keeps self-resizing interactives from adding noise.

---

### How coalesced causes are ranked
**Context**: An early draft said `scroll` and `embeddableResize` never displace a pending cause of another kind, which also stopped a scroll from displacing a pending resize. Scrolling 1000px on `sample-activity-multiple-layout-types` page 7 made five interactives resize within 420ms (they lazy-load as they come into view), so a student's scroll could be reported as `embeddableResize`.
**Decision**: Rank the causes: `embeddableResize` < `scroll` < every other cause, and an equal or higher rank replaces the pending cause. Resizes follow scrolls and layout changes, and scrolls follow layout changes (the container clamps its scroll position as the page reflows), so the lower-ranked cause is a side effect of the higher one.

---

### What counts toward `embeddableCount`
**Context**: CLUE counts every tile rendered in the document. AP renders hidden notebook tabs with real heights.
**Options considered**:
- A) Only measurable embeddables on the current view (excludes hidden tabs, collapsed columns, `is_hidden`)
- B) Every embeddable on the authored page

**Decision**: A. The count is the denominator a researcher divides by ("saw 3 of 7"); counting content the student cannot reach without a tab click or column toggle inflates it.

---

### Whether opening an overlay should be a cause
**Context**: Jira names "the sidebar" as an example layout change. In AP the sidebar, glossary, chat drawer and modal are fixed overlays that do not move embeddables (verified in the running app).
**Options considered**:
- A) Not causes; researchers join on the existing toggle events
- B) Log a snapshot with a `sidebarToggle` / `dialogToggle` cause anyway, matching Jira's wording
- C) Compute occlusion so an overlay reduces `percentVisible`

**Decision**: A. B would log a duplicate of the previous snapshot. Jira's intent, a snapshot after anything that changes the layout, is met by the causes that do change it. C is out of scope: the overlays cover content horizontally, which a vertical-only percentage cannot express.

---

### Whether to log the tab being hidden
**Context**: Without it, a researcher computing dwell time from successive events counts time the student spent in another browser tab as viewing.
**Options considered**:
- A) Log `pageHidden` with empty `visibleEmbeddables` immediately when the tab is hidden, and a `pageVisible` snapshot when it returns
- B) Leave it out, as CLUE does

**Decision**: A. Each event describes a view that lasts until the next one, so without a hidden marker the last snapshot before a tab switch claims all the time away. The causes are additive, so events still match CLUE's shape. Logged immediately because a hidden tab throttles timers. Delivery on tab close is not guaranteed (asynchronous `XMLHttpRequest`), which is recorded as a limitation shared with every unload-time event rather than switching transports for one event.

---

### Whether to log focus moving between embeddables
**Context**: AP can see the window blur when an iframe takes focus and read `document.activeElement`; the question interactives already log `focus in` / `focus out`, but MwInteractive and text blocks do not.
**Options considered**:
- A) Out of scope for AP-140; a follow-up story if researchers want it
- B) Add an `EMBEDDABLE_FOCUS_CHANGE` event in this story

**Decision**: A. It is a different question (where input goes, not what is seen), CLUE has no counterpart, and the story is sized as WM-65's replacement.

---

### How entries are ordered
**Context**: `section.tsx` renders the left column's embeddables, then the right column's, so DOM order differs from visual top-to-bottom order in split layouts.
**Decision**: Document order, with the split-column case spelled out, so a test asserting the entry order has one definition.

---

### What the viewport is in log-monitor mode
**Context**: With `?logMonitor=true`, `.app` is the scroller and measured 969px tall in an 889px window, so measuring against its rect would count 80px below the window as visible.
**Decision**: The scroll container's rect clipped to the window, for both `viewportHeight` and the overlap math.

---

### Where the timers and listeners live
**Options considered**:
- A) A framework-free tracker class, provided through context
- B) A hook used by both page roots
- C) Inline in `ActivityPageContent`, as CLUE does in `DocumentContent`

**Decision**: A. `ActivityPageContent` is a class and cannot call a hook, so B would mean converting it or duplicating the logic; C would leave `SinglePageContent` unlogged. A class is also testable with fake timers alone.

---

### Registration through context instead of querying the DOM
**Options considered**:
- A) Each `Embeddable` registers its element and metadata
- B) The tracker queries `[data-cy="embeddable"]` under the page and reads new `data-*` attributes for id, type and title

**Decision**: A. Mounting already encodes most of "measurable" (collapsed columns and hidden types never mount), the metadata comes from the authored object with no attributes added to the DOM, and the ResizeObserver set stays in step with mount and unmount without a MutationObserver. The registering effect depends on the fields it reads rather than the `embeddable` object, so an equal but new object does not re-register.

---

### No lodash
**Context**: CLUE uses lodash `debounce`; AP has no direct lodash dependency.
**Decision**: A single `setTimeout` restarted in `queue`, with its delay capped by the time since the burst's first trigger (lodash's `maxWait`). The tracker needs flush and cancel, which are two lines each, and adding a dependency for them is not worth it.

---

### Reading the first registered element
**Context**: `const [first] = this.elements.keys()` fails `tsc` with TS2569, since the project targets ES5 without `downlevelIteration`.
**Decision**: Use `this.elements.keys().next().value`, which typechecks and lints clean.
