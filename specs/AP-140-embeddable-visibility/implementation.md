# Implementation Plan: Log Which Embeddables Are Visible on the Page

**Jira**: https://concord-consortium.atlassian.net/browse/AP-140
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **In Development**

## Implementation Plan

The work splits into three layers, each its own commit: pure helpers (the math and the params), a framework-free tracker that owns the timers, listeners and measurement, and the React wiring that gives the tracker its elements and causes. This follows CLUE-629's split (`tile-visibility.ts` pure, `document-content.tsx` stateful) but moves the stateful part out of the component, because AP has two page roots (`ActivityPageContent`, a class, and `SinglePageContent`, a function component) that both need it.

The tracker never looks the embeddables up in the DOM. Each `Embeddable` registers its own outer element with the tracker through context, so "measurable" is decided by what is mounted (a collapsed column's embeddables are not), plus one check at measure time for hidden notebook tabs, whose embeddables stay mounted with real heights.

### Pure visibility helpers

**Summary**: The types, the vertical-percent math, the cause ranking, the snapshot comparison and the params builder, with no DOM or React, so every rule in "The event" and "Causes and settling" that is pure arithmetic is unit-tested directly.

**Files affected**:
- `src/utilities/embeddable-visibility.ts`: new
- `src/utilities/embeddable-visibility.test.ts`: new

**Estimated diff size**: ~190 lines

```ts
// src/utilities/embeddable-visibility.ts
// Pure helpers for embeddable-visibility logging, kept free of React and the DOM so the math and
// the params assembly are unit-tested without mounting a page. Modeled on CLUE's tile-visibility.ts.

export type VisibilityCause =
  "scroll" | "windowResize" | "pageChange" | "tabChange" | "columnToggle" | "embeddableResize"
  | "pageHidden" | "pageVisible";

export interface IEmbeddableInfo {
  embeddableId: string;
  embeddableTitle: string;
  questionNumber?: number; // only when the item's header shows "Question #N"
}

export interface IVisibleEmbeddable extends IEmbeddableInfo {
  percentVisible: number; // whole percent, 1..100 (embeddables at 0 are dropped)
}

/** An embeddable's vertical extent, in the same coordinate space as the viewport bounds. */
export interface IEmbeddableExtent extends IEmbeddableInfo {
  top: number;
  bottom: number;
  height: number;
}

export interface IViewportBounds {
  top: number;
  bottom: number;
}

/** The scroll container's vertical bounds clipped to the window, since the container can extend below it. */
export function getViewportBounds(container: IViewportBounds, windowHeight: number): IViewportBounds {
  return { top: Math.max(container.top, 0), bottom: Math.min(container.bottom, windowHeight) };
}

/**
 * For each embeddable, the fraction of its height inside the viewport, rounded to a whole percent.
 * Embeddables with no overlap or no height are omitted. Input order is preserved.
 */
export function computeVisibleEmbeddables(viewport: IViewportBounds, extents: IEmbeddableExtent[]): IVisibleEmbeddable[] {
  const visible: IVisibleEmbeddable[] = [];
  for (const { top, bottom, height, ...info } of extents) {
    if (height <= 0) continue;
    const overlap = Math.min(bottom, viewport.bottom) - Math.max(top, viewport.top);
    if (overlap <= 0) continue;
    // Any positive overlap counts as visible, so clamp to 1 rather than letting a sliver round to 0.
    visible.push({ ...info, percentVisible: Math.max(1, Math.min(100, Math.round((overlap / height) * 100))) });
  }
  return visible;
}

// A resize follows scrolls and layout changes, and a scroll follows layout changes, so a
// lower-ranked cause is a side effect of a higher-ranked one and never replaces it.
const causeRank = (cause: VisibilityCause) =>
  cause === "embeddableResize" ? 0 : cause === "scroll" ? 1 : 2;

/** The cause to report when another trigger arrives before the pending snapshot settles. */
export function nextVisibilityCause(pending: VisibilityCause | undefined, incoming: VisibilityCause) {
  return pending && causeRank(incoming) < causeRank(pending) ? pending : incoming;
}

export function sameVisibleEmbeddables(a: IVisibleEmbeddable[], b: IVisibleEmbeddable[]) {
  return a.length === b.length && a.every((entry, i) =>
    entry.embeddableId === b[i].embeddableId && entry.percentVisible === b[i].percentVisible);
}

export function buildVisibilityLogParams(
  cause: VisibilityCause, viewportHeight: number, embeddableCount: number, visibleEmbeddables: IVisibleEmbeddable[]
) {
  return { cause, viewportHeight, embeddableCount, visibleEmbeddables };
}
```

Tests (`embeddable-visibility.test.ts`), each named for the mutation it catches:
- `computeVisibleEmbeddables`: fully inside (100), half off the top (50), half off the bottom (50), a 1px sliver of a 1000px embeddable (1, not dropped: catches removing the `Math.max(1, …)` clamp), touching the edge with zero overlap (dropped), zero height (dropped), taller than the viewport and filling it (a 2000px extent in an 889px viewport gives 44: catches dividing by the viewport instead of the embeddable), input order preserved for three entries given out of vertical order.
- `getViewportBounds`: a container from 0 to 969 in an 888px window gives 0 to 888; a container fully inside the window is unchanged.
- `nextVisibilityCause`: the full 3×3 rank table using one representative per rank (`embeddableResize`, `scroll`, `columnToggle`), plus `undefined` pending, plus two different rank-2 causes (newest wins). The table form is what catches a swapped comparison.
- `sameVisibleEmbeddables`: equal; same ids with one percent different; different lengths; same ids in a different order.

---

### Embeddable visibility tracker

**Summary**: One object per mounted page that holds the registered elements, listens for scrolls, window resizes, element resizes and tab visibility, debounces them into one measurement 500ms after the last trigger, and logs `EMBEDDABLE_VISIBILITY_CHANGE`. Framework-free so it is tested with fake timers and stubbed geometry, without React.

**Files affected**:
- `src/lib/logger.ts`: add `EMBEDDABLE_VISIBILITY_CHANGE` to `LogEventName`
- `src/utilities/embeddable-visibility-tracker.ts`: new
- `src/utilities/embeddable-visibility-tracker.test.ts`: new

**Estimated diff size**: ~380 lines

`LogEventName` gains one member, appended last:

```ts
  click_show_feedback_button,
  EMBEDDABLE_VISIBILITY_CHANGE
}
```

`Logger.log` logs a member by its name (`LogEventName[event]`), so the event string is exactly `EMBEDDABLE_VISIBILITY_CHANGE`.

```ts
// src/utilities/embeddable-visibility-tracker.ts
import { Logger, LogEventName } from "../lib/logger";
import {
  buildVisibilityLogParams, computeVisibleEmbeddables, getViewportBounds, IEmbeddableExtent, IEmbeddableInfo,
  IVisibleEmbeddable, nextVisibilityCause, sameVisibleEmbeddables, VisibilityCause
} from "./embeddable-visibility";

export const kVisibilitySettleMs = 500;

type VisibilityLogger = (parameters: ReturnType<typeof buildVisibilityLogParams>) => void;

const logVisibility: VisibilityLogger = parameters =>
  Logger.log({ event: LogEventName.EMBEDDABLE_VISIBILITY_CHANGE, parameters });

export interface IEmbeddableVisibilityTracker {
  /** Starts measuring an embeddable's outer element; returns the function that stops. */
  register: (element: HTMLElement, info: IEmbeddableInfo) => () => void;
  queue: (cause: VisibilityCause) => void;
}

// The nearest ancestor that scrolls: #app normally, .app with ?logMonitor=true.
const scrollContainerOf = (element: Element) => {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return undefined;
};

const byDocumentOrder = (a: { element: Element }, b: { element: Element }) =>
  a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

export class EmbeddableVisibilityTracker implements IEmbeddableVisibilityTracker {
  private elements = new Map<HTMLElement, IEmbeddableInfo>();
  private resizeObserver?: ResizeObserver;
  private pendingCause?: VisibilityCause;
  private timer?: number;
  // The last snapshot logged, so a resize that changes nothing is skipped and a hidden tab only
  // closes a view that was actually reported.
  private lastLogged?: IVisibleEmbeddable[];
  private disposed = false;

  constructor(private log: VisibilityLogger = logVisibility, private settleMs = kVisibilitySettleMs) {
    if (typeof window.ResizeObserver !== "undefined") {
      this.resizeObserver = new window.ResizeObserver(() => this.queue("embeddableResize"));
    }
  }

  start() {
    // Capture phase: the page scrolls inside #app (or .app), and element scroll events don't bubble.
    document.addEventListener("scroll", this.handleScroll, true);
    window.addEventListener("resize", this.handleWindowResize);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.queue("pageChange");
  }

  register = (element: HTMLElement, info: IEmbeddableInfo) => {
    if (this.disposed) return () => undefined;
    this.elements.set(element, info);
    this.resizeObserver?.observe(element);
    return () => {
      this.elements.delete(element);
      this.resizeObserver?.unobserve(element);
    };
  };

  queue = (cause: VisibilityCause) => {
    if (this.disposed || document.visibilityState === "hidden") return;
    this.pendingCause = nextVisibilityCause(this.pendingCause, cause);
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(this.settle, this.settleMs);
  };

  /**
   * Stops all triggers. A pending scroll is logged now, while the page is still mounted; any other
   * pending cause is dropped, because the next page reports its own pageChange.
   */
  dispose() {
    document.removeEventListener("scroll", this.handleScroll, true);
    window.removeEventListener("resize", this.handleWindowResize);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.resizeObserver?.disconnect();
    if (this.pendingCause === "scroll") {
      this.settle();
    } else {
      this.cancel();
    }
    this.disposed = true;
    this.elements.clear();
  }

  private settle = () => {
    const cause = this.pendingCause;
    this.cancel();
    if (cause) this.emit(cause);
  };

  private cancel() {
    window.clearTimeout(this.timer);
    this.timer = undefined;
    this.pendingCause = undefined;
  }

  private handleScroll = (e: Event) => {
    const { target } = e;
    // Only scrolls that move the page: the chat, sidebar and glossary have scrollers of their own.
    const first: HTMLElement | undefined = this.elements.keys().next().value;
    if (target === document || (first && target instanceof Element && target.contains(first))) {
      this.queue("scroll");
    }
  };

  private handleWindowResize = () => this.queue("windowResize");

  private handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      // Record the view the student left before marking it hidden; logged immediately since a
      // hidden tab throttles timers.
      this.settle();
      if (this.lastLogged?.length) {
        const { viewportHeight, embeddableCount } = this.measure();
        this.log(buildVisibilityLogParams("pageHidden", viewportHeight, embeddableCount, []));
        this.lastLogged = [];
      }
    } else {
      this.queue("pageVisible");
    }
  };

  private measure() {
    const extents: (IEmbeddableExtent & { element: HTMLElement })[] = [];
    this.elements.forEach((info, element) => {
      // Non-selected notebook tabs keep their embeddables mounted at full height.
      if (element.closest(".hidden-tab")) return;
      const { top, bottom, height } = element.getBoundingClientRect();
      extents.push({ ...info, top, bottom, height, element });
    });
    extents.sort(byDocumentOrder);
    const container = extents[0] && scrollContainerOf(extents[0].element);
    const viewport = getViewportBounds(
      container?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight }, window.innerHeight);
    return {
      viewportHeight: Math.round(Math.max(0, viewport.bottom - viewport.top)),
      embeddableCount: extents.length,
      visibleEmbeddables: computeVisibleEmbeddables(viewport, extents.map(({ element, ...extent }) => extent))
    };
  }

  private emit(cause: VisibilityCause) {
    const { viewportHeight, embeddableCount, visibleEmbeddables } = this.measure();
    if (visibleEmbeddables.length === 0) return;
    if (cause === "embeddableResize" && this.lastLogged && sameVisibleEmbeddables(this.lastLogged, visibleEmbeddables)) {
      return;
    }
    this.log(buildVisibilityLogParams(cause, viewportHeight, embeddableCount, visibleEmbeddables));
    this.lastLogged = visibleEmbeddables;
  }
}
```

Tests (`embeddable-visibility-tracker.test.ts`) use jest fake timers, an injected `log` mock, a fake `window.ResizeObserver` that records observed elements and exposes a `trigger()` (jsdom has none), `window.innerHeight` set to 800, and elements appended to a `div` with `overflow-y: auto` whose `getBoundingClientRect` is stubbed per test. Each case states what it pins:
- `start()` then 499ms: no log; 500ms: one log with cause `pageChange` and the expected entries (pins the settle delay and the initial snapshot).
- Two scrolls 300ms apart log once, 500ms after the second (pins the trailing debounce rather than a throttle).
- `pageChange` pending, then a resize trigger and a scroll: one log, cause `pageChange`. `embeddableResize` pending, then a scroll: cause `scroll` (pins the rank wiring end to end; the 3×3 table lives in the helper tests).
- A scroll event whose target is an unrelated scroller (a sibling `div` that does not contain the page) does not queue; one whose target contains the page does (pins the target filter).
- An element inside a `.hidden-tab` ancestor is excluded from both `visibleEmbeddables` and `embeddableCount`; assert `embeddableCount` is 2 of 3 registered, not just that the entry is missing.
- Entries come out in document order when registered in reverse order (pins the sort).
- Viewport from a container stubbed at 0 to 969 with `innerHeight` 800: an element at 850 to 900 is omitted and `viewportHeight` is 800 (pins the window clip).
- A resize that leaves the snapshot unchanged logs nothing; one that changes a percentage logs `embeddableResize` (assert the call count goes 1 → 1 → 2).
- No visible element: no log.
- `visibilitychange` to hidden with a scroll pending: two logs in order, the scroll snapshot then `pageHidden` with `visibleEmbeddables: []`, synchronously and with no timer advance. Hidden again with nothing logged since: no second `pageHidden`. Back to visible: a `pageVisible` snapshot after 500ms. Triggers while hidden queue nothing.
- `dispose()` with a scroll pending logs it immediately; with `columnToggle` pending logs nothing, and advancing timers afterwards still logs nothing. After `dispose()`, `register` returns a no-op and scroll events queue nothing (listener removed).
- `document.visibilityState` is mocked with `jest.spyOn(document, "visibilityState", "get")`.

---

### Wire the tracker into the page

**Summary**: A context and a provider that owns one tracker per mounted page, embeddables registering their outer element, sections reporting column toggles and tab changes, and both page roots wrapped in the provider.

**Files affected**:
- `src/components/embeddable-visibility-context.ts`: new, next to the other contexts
- `src/components/activity-page/embeddable-visibility-provider.tsx`: new
- `src/utilities/activity-utils.ts`: add `displayedQuestionNumber`
- `src/components/activity-page/managed-interactive/managed-interactive.tsx`: use it for the header's number
- `src/components/activity-page/embeddable.tsx`: register the outer `div`
- `src/components/activity-page/section.tsx`: queue `columnToggle` and `tabChange`
- `src/components/activity-page/activity-page-content.tsx`: wrap the page's `<main>` contents
- `src/components/single-page/single-page-content.tsx`: wrap the `<main>` contents
- `src/components/activity-page/embeddable-visibility-provider.test.tsx`: new
- `src/components/activity-page/embeddable.test.tsx`, `section.test.tsx`, `src/utilities/activity-utils.test.ts`: new cases

**Estimated diff size**: ~260 lines

```ts
// src/components/embeddable-visibility-context.ts
import React from "react";
import { IEmbeddableVisibilityTracker } from "../utilities/embeddable-visibility-tracker";

// Undefined outside a page root (intro, completion and sequence pages, and component tests), where
// embeddables are not measured.
export const EmbeddableVisibilityContext = React.createContext<IEmbeddableVisibilityTracker | undefined>(undefined);
```

```tsx
// src/components/activity-page/embeddable-visibility-provider.tsx
import React, { useEffect, useState } from "react";
import { EmbeddableVisibilityContext } from "../embeddable-visibility-context";
import { EmbeddableVisibilityTracker } from "../../utilities/embeddable-visibility-tracker";

// Mount one per page: mounting reports a pageChange and unmounting ends the page's logging.
export const EmbeddableVisibilityProvider: React.FC = ({ children }) => {
  const [tracker] = useState(() => new EmbeddableVisibilityTracker());
  useEffect(() => {
    tracker.start();
    return () => tracker.dispose();
  }, [tracker]);
  return <EmbeddableVisibilityContext.Provider value={tracker}>{children}</EmbeddableVisibilityContext.Provider>;
};
```

Effect order makes this compose (verified with a throwaway test under React 16.14): children's effects run before the provider's, so every embeddable is registered before `start()` queues `pageChange`; on unmount the provider's cleanup runs first, with every element still registered and attached, so `dispose()` can measure a pending scroll, and the embeddables' unregister calls that follow hit a cleared map.

The question number the header shows and the one the log records come from one helper in `activity-utils.ts`, next to `isQuestion`:

```ts
/** The number a question's header shows as "Question #N", or undefined when it shows none. */
export const displayedQuestionNumber = (questionNumber: number | undefined, hideQuestionNumbers?: boolean) =>
  hideQuestionNumbers ? undefined : questionNumber;
```

`managed-interactive.tsx` passes `displayedQuestionNumber(questionNumber, props.hideQuestionNumbers)` to `ManagedInteractiveHeader` in place of the inline ternary.

`embeddable.tsx`, among the existing hooks (before the `return null` for unrendered types, so `targetDiv.current` is simply null for those):

```tsx
const visibility = useContext(EmbeddableVisibilityContext);
useEffect(() => {
  const element = targetDiv.current;
  if (!visibility || !element || embeddable.is_hidden) return;
  const shownQuestionNumber = displayedQuestionNumber(questionNumber, hideQuestionNumbers);
  return visibility.register(element, {
    embeddableId: embeddable.ref_id,
    embeddableTitle: embeddable.name?.trim() ?? "",
    ...(shownQuestionNumber ? { questionNumber: shownQuestionNumber } : {})
  });
}, [visibility, embeddable.ref_id, embeddable.name, embeddable.is_hidden, questionNumber, hideQuestionNumbers]);
```

The spread leaves the key out entirely, rather than present as `undefined`, so a test asserting the registered object with `toEqual` cannot pass when a stray `questionNumber: undefined` is added.

The dependencies are the fields read rather than the `embeddable` object, so a re-render that hands down an equal but new object does not unregister and re-register (which would restart the element's ResizeObserver and queue a resize).

`section.tsx`:

```tsx
const visibility = useContext(EmbeddableVisibilityContext);
// A notebook tab switch shows one section and hides another; both report it, which coalesces.
const prevHiddenTab = useRef(hiddenTab);
useEffect(() => {
  if (prevHiddenTab.current === hiddenTab) return;
  prevHiddenTab.current = hiddenTab;
  visibility?.queue("tabChange");
}, [hiddenTab, visibility]);
```

and in `handleCollapseHeader`, after `setIsSecondaryCollapsed(...)`, `visibility?.queue("columnToggle");`. The 500ms settle runs well after the re-render, so the measurement sees the new layout.

`activity-page-content.tsx` wraps the children of `<main className="page-content …">` in `<EmbeddableVisibilityProvider>`; `single-page-content.tsx` does the same inside its `<main>`. The provider renders no DOM, so layout and CSS are untouched. `ActivityPageContent` is keyed by page (`key={page-N}`) and the activity is keyed by index, so page navigation, sequence activity changes and the return from the idle or error screen all remount the provider, which is what makes them `pageChange`.

Tests:
- `embeddable-visibility-provider.test.tsx`: render the provider around a component that registers an element, with `Logger.log` spied and fake timers. After 500ms, one `Logger.log` call with `event: LogEventName.EMBEDDABLE_VISIBILITY_CHANGE` and `parameters.cause` `pageChange` (pins that `Logger.log` is the sink and the event name). Unmount with a scroll pending: logged synchronously.
- `embeddable.test.tsx`: inside a context with a mock tracker, an Xhtml embeddable registers its `data-cy="embeddable"` element with `{ embeddableId: ref_id, embeddableTitle: <trimmed name> }`, and the returned unregister is called on unmount; an interactive rendered with `questionNumber={3}` registers `questionNumber: 3`, the same interactive with `hideQuestionNumbers` registers without the key (assert with `not.toHaveProperty("questionNumber")`), and the Xhtml registration has no `questionNumber`; an `is_hidden` embeddable does not register; a windowShade plugin outside teacher edition does not register; with no context, rendering still works (existing tests cover this already, since none of them provide one).
- `activity-utils.test.ts`: `displayedQuestionNumber(3)` is 3, `displayedQuestionNumber(3, true)` is undefined, `displayedQuestionNumber(undefined)` is undefined.
- `section.test.tsx`: clicking the collapsible header queues `columnToggle` once; re-rendering with `hiddenTab` flipped queues `tabChange` once, and re-rendering with it unchanged queues nothing.

## Expected behavior in the running app

Measured with the plan built as throwaway code against the dev server (`sample-activity-multiple-layout-types`, `sample-activity-notebook`, `sample-activity-single-page-layout`), capturing the logger's POSTs:
- A page load logs `pageChange` about 550ms after `change_activity_page`, then one or two `embeddableResize` corrections over the next 1.5s as interactives settle their heights. Three events per page view is the normal volume before the student scrolls.
- A scroll pending when the student navigates is logged with the old `activityPage`, just before `change_activity_page`.
- A notebook tab switch logs `tabChange` with `embeddableCount` covering only the selected tab.
- Single-page layout counts every embeddable across its pages.

## Open Questions

### RESOLVED: Judgment call: where the timers and listeners live
**Options considered**:
- A) A framework-free tracker class, provided through context
- B) A hook used by both page roots
- C) Inline in `ActivityPageContent`, as CLUE does in `DocumentContent`

**Decision**: A. `ActivityPageContent` is a class and cannot call a hook, so B would mean converting it or duplicating the logic; C would leave `SinglePageContent` unlogged. A class is also testable with fake timers alone.

### RESOLVED: Judgment call: registration through context instead of querying the DOM
**Options considered**:
- A) Each `Embeddable` registers its element and metadata
- B) The tracker queries `[data-cy="embeddable"]` under the page and reads new `data-*` attributes for id, type and title

**Decision**: A. Mounting already encodes most of "measurable" (collapsed columns and hidden types never mount), the metadata comes from the authored object with no attributes added to the DOM, and the ResizeObserver set stays in step with mount and unmount without a MutationObserver.

### RESOLVED: Judgment call: no lodash
**Context**: CLUE uses lodash `debounce`; AP has no direct lodash dependency.
**Decision**: A single `setTimeout` restarted in `queue`. The tracker needs flush and cancel, which are two lines each here, and adding a dependency for them is not worth it.

## Self-Review

Roles: Senior Engineer, commit reviewer, test author, operator. The plan was built in the working tree as throwaway code (all three steps), typechecked, linted, run under Jest with draft versions of the tracker tests, and exercised in the browser; only findings that survived that are recorded. The commit reviewer's and test author's checks found nothing: each step compiles without the next, the draft tracker tests (fake `window.ResizeObserver`, stubbed `getBoundingClientRect`, an inline `overflow-y: auto` container, a `visibilityState` spy) passed, and the 93 existing tests in `src/components/activity-page` and `src/components/single-page` passed with the wiring in place.

### Senior Engineer

#### RESOLVED: Destructuring a `Map` iterator does not compile in this repo
`const [first] = this.elements.keys()` failed `tsc` with TS2569 (the project targets ES5 without `downlevelIteration`). Replaced with `this.elements.keys().next().value`; the rebuilt throwaway then typechecked and linted clean.
