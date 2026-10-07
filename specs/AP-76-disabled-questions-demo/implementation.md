# Implementation Plan: Disabled Questions: Activity Player Demo

**Jira**: https://concord-consortium.atlassian.net/browse/AP-76
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **In Development**

## Implementation Plan

A gating item reaches to the end of the page, and "after" follows question-numbering order, so a split-layout section is read left column then right. `Section` already decides that order when it numbers questions; the first step moves the decision into a helper both `Section` and the plan use, so the two cannot drift.

### Share the section's column order

**Summary**: Move the layout logic that splits a section into a single column or a left and right column out of `Section` into a pure helper, with no change in behavior. The plan in the next step reads the same helper to know which questions come after a gating item.

**Files affected**:
- `src/utilities/section-columns.ts` (new) and `section-columns.test.ts` (new)
- `src/components/activity-page/section.tsx`: use the helper in place of its inline layout booleans and column filters
- `src/components/activity-page/section.test.tsx`: column order and numbering in split layouts

**Estimated diff size**: ~170 lines

```ts
import { EmbeddableType, SectionType } from "../types";
import { ActivityLayouts } from "./activity-utils";

const kSplitLayouts = ["60-40", "40-60", "70-30", "30-70", "responsive-30-70", "responsive-2-column", "responsive-50-50"];
// The other split layouts put the secondary column on the left.
const kPrimaryLeftLayouts = ["60-40", "70-30"];

export interface ISectionColumns {
  /** The section renders as one column: a full-width layout, or a single-page activity. */
  stacked: boolean;
  /** The section's layout is single-column, not merely stacked by the activity layout. */
  singleColumn: boolean;
  /** Visible embeddables of the left and right columns; empty when stacked. */
  left: EmbeddableType[];
  right: EmbeddableType[];
  leftIsPrimary: boolean;
}

export const getSectionColumns = (section: SectionType, activityLayout: number): ISectionColumns => {
  const { layout, embeddables } = section;
  const hasColumns = kSplitLayouts.includes(layout) || layout === "responsive";
  const primary = hasColumns ? embeddables.filter(e => e.column === "primary" && !e.is_hidden) : [];
  const secondary = hasColumns ? embeddables.filter(e => e.column === "secondary" && !e.is_hidden) : [];
  const singleColumn = layout === "full-width" || layout === "responsive-full-width";
  const stacked = singleColumn || activityLayout === ActivityLayouts.SinglePage;
  const leftIsPrimary = kPrimaryLeftLayouts.includes(layout);
  return {
    stacked,
    singleColumn,
    left: stacked ? [] : leftIsPrimary ? primary : secondary,
    right: stacked ? [] : leftIsPrimary ? secondary : primary,
    leftIsPrimary
  };
};

/** A section's embeddables in the order its questions are numbered. */
export const embeddablesInNumberingOrder = (section: SectionType, activityLayout: number): EmbeddableType[] => {
  const { stacked, left, right } = getSectionColumns(section, activityLayout);
  return stacked ? section.embeddables : [...left, ...right];
};
```

`Section`'s `responsiveIsSingleColumn` is dropped rather than moved: it requires `responsive-full-width`, which `singleColumn` already covers, so it never changes the result. `Section` keeps its class names and rendering; it reads `stacked` where it tested `singleColumn || singlePage`, passes `singleColumn` to `renderEmbeddables` as now, and takes the left and right lists and `leftIsPrimary` from the helper. The right column's first question number counts the questions in `left`.

Tests (`section-columns.test.ts`), each over a section with distinct embeddables in both columns: `60-40` and `70-30` put primary on the left; `40-60`, `30-70`, `responsive-30-70`, `responsive-2-column`, `responsive-50-50` and `responsive` put secondary on the left; `full-width` and `responsive-full-width` are `stacked` and `singleColumn`; a split layout in a single-page activity is `stacked` but not `singleColumn`; hidden embeddables are left out of `left` and `right`; `embeddablesInNumberingOrder` returns left then right for a split section and the array for a stacked one. The existing `section.test.tsx` cases (layout classes, collapsible column side) run unchanged; none of them checks column order, so new cases render a `40-60` and a `60-40` section with a question in each column and assert which column comes first in the DOM and how the two questions are numbered.

---

### Plan which questions each gating item disables

**Summary**: A pure module that turns a page, its activity layout, and each item's `question_gating` value into "gating item to the questions it disables". In this pull request the values come from the `override:disableQuestionsAfter` parameter; the later pull request that reads LARA-226's field from the activity JSON merges the parameter's values over the authored ones and passes the result in. Pure so the ordering rules are tested without React or Firestore, and kept out of `page-walk.ts`, which must stay free of `url-query` imports so `chat-context.ts` can be lifted into the report service.

**Files affected**:
- `src/utilities/disabled-questions.ts` (new): parameter parsing, planning, gate status transitions
- `src/utilities/disabled-questions.test.ts` (new)

**Estimated diff size**: ~250 lines

```ts
import { EmbeddableType, Page, SectionType } from "../types";
import { getVisibleSections, isQuestion } from "./page-walk";
import { embeddablesInNumberingOrder } from "./section-columns";

export const kDisableQuestionsAfterParam = "override:disableQuestionsAfter";

/** Gating item ref_id to the ref_ids of the questions it disables, in page order. */
export type DisabledQuestionsPlan = Record<string, string[]>;

/** The values of LARA's per-item `question_gating` setting that this Activity Player acts on. */
export type QuestionGating = "none" | "disable_following_on_page";

/** Item ref_id to its `question_gating` value. */
export type QuestionGatingSettings = Record<string, QuestionGating>;

// Interactives that save learner state, whether or not their question number is shown.
const savesLearnerState = (embeddable: EmbeddableType) => isQuestion(embeddable, { ignoreHideQuestionNumber: true });

/** The URL parameter sets `question_gating: "disable_following_on_page"` on each item it names. */
export const parseQuestionGatingParam = (value: string | undefined): QuestionGatingSettings => {
  const refIds = (value ?? "").split(",").map(refId => refId.trim()).filter(refId => refId.length > 0);
  return Object.fromEntries(refIds.map(refId => [refId, "disable_following_on_page" as QuestionGating]));
};

export const planDisabledQuestions = (page: Page, activityLayout: number, settings: QuestionGatingSettings): DisabledQuestionsPlan => {
  const plan: DisabledQuestionsPlan = {};
  if (Object.keys(settings).length === 0) return plan;
  const embeddables = getVisibleSections(page)
    .flatMap(section => embeddablesInNumberingOrder(section, activityLayout))
    .filter(embeddable => !embeddable.is_hidden);
  embeddables.forEach((embeddable, index) => {
    if (settings[embeddable.ref_id] !== "disable_following_on_page" || !savesLearnerState(embeddable)) return;
    plan[embeddable.ref_id] = embeddables.slice(index + 1).filter(savesLearnerState).map(e => e.ref_id);
  });
  return plan;
};

/**
 * For the notebook layout, where only one tab shows at a time: each gating item to the tabs after its own
 * (visible sections) that hold a question it disables. Each of those tabs shows the banner under the tabs.
 * A gating item whose first disabled question is in a tab that already shows that banner joins it there.
 */
export const planTabBanners = (page: Page, plan: DisabledQuestionsPlan): Record<string, SectionType[]> => {
  const sections = getVisibleSections(page);
  const sectionIndexOf = (refId: string) => sections.findIndex(s => s.embeddables.some(e => e.ref_id === refId));
  const tabs: Record<string, SectionType[]> = {};
  Object.entries(plan).forEach(([gatingRefId, questionRefIds]) => {
    const gatingIndex = sectionIndexOf(gatingRefId);
    const reached = new Set(questionRefIds.map(sectionIndexOf).filter(index => index > gatingIndex));
    tabs[gatingRefId] = sections.filter((_, index) => reached.has(index));
  });
  const covered = new Set(Object.values(tabs).flat());
  Object.entries(plan).forEach(([gatingRefId, questionRefIds]) => {
    const firstTab = sections[sectionIndexOf(questionRefIds[0])];
    if (firstTab && covered.has(firstTab) && !tabs[gatingRefId].includes(firstTab)) {
      tabs[gatingRefId] = [firstTab, ...tabs[gatingRefId]];
    }
  });
  return tabs;
};

export type GateStatus = "loading" | "locked" | "unlockedOnLoad" | "unlockedDuringVisit";

/** Applies one saved-state report for a gating item. Unlocking is one way within a visit. */
export const nextGateStatus = (status: GateStatus, hasSavedState: boolean): GateStatus => {
  if (status === "unlockedOnLoad" || status === "unlockedDuringVisit") return status;
  if (hasSavedState) return status === "loading" ? "unlockedOnLoad" : "unlockedDuringVisit";
  return "locked";
};
```

Tests (`disabled-questions.test.ts`), each built from a fixture page whose items differ so a wrong rule gives a different list:
- `parseQuestionGatingParam`: `undefined`, `""`, `"a"`, `" a, b ,,"` give `{}`, `{}`, `{a: "disable_following_on_page"}`, and the same value for both `a` and `b`.
- A gating item whose setting is `"none"` disables nothing, so only `"disable_following_on_page"` acts.
- Plan for a page `[text, model(gating), q1, image, q2(hidden number)]` is exactly `{model: [q1, q2]}`: text and image skipped, the gating item excluded, the hidden-number question included.
- Questions before the gating item are not in its list (`[q0, model, q1]` gives `{model: [q1]}`).
- Page scope across sections: a question in a later visible section is included; one in a hidden section, or a hidden embeddable, is not.
- Split layouts follow numbering order: a `40-60` section `[model(primary), qA(secondary), qB(secondary)]` gives `{model: []}` because the secondary column is on the left and numbered first; a `60-40` section `[qA(secondary), model(primary), qB(primary)]` gives `{model: [qB, qA]}`; the same `40-60` section in a single-page activity is stacked and gives `{model: [qA, qB]}`.
- Ignored gating ids: a `ref_id` not on the page, a hidden one, a text box, and an `MwInteractive` without `enable_learner_state` each give `{}`.
- Two gating items `[m1, q1, m2, q2]` give `{m1: [q1, m2, q2], m2: [q2]}`.
- `planTabBanners` over three tabs `[m, q1] [text] [q2]` gives `{m: [tab 3]}`: the gating item's own tab and a tab with no disabled question are left out. With `m` last in tab 1 (`[q0, m] [q1] [q2]`) it gives `{m: [tab 2, tab 3]}`, the case where the first disabled question is itself in a later tab. With a second gating item inside a tab the first one's banner covers (`[a, q1] [b, q2] [q3]`) it gives `{a: [tab 2, tab 3], b: [tab 2, tab 3]}`: `b` joins tab 2's banner rather than adding its own.
- `nextGateStatus`: all eight (status, hasSavedState) pairs, asserting `unlocked*` never returns to `locked` and `loading` splits into `unlockedOnLoad` versus `locked`.

---

### Track gate status for the page

**Summary**: A provider around the page's sections that watches each gating item's saved answer and answers, per question, whether it is disabled, grayed, and which banner it anchors, and per notebook tab, which banner it shows under the tabs. Wired here into `ActivityPageContent` and, one provider per authored page, into `SinglePageContent`, which renders single-page activities without going through `ActivityPageContent`; nothing reads it until the next steps, so pages are unchanged.

**Files affected**:
- `src/components/activity-page/disabled-questions-context.tsx` (new): context, provider, `useQuestionLock`, `useTabBanner`
- `src/components/activity-page/disabled-questions-context.test.tsx` (new)
- `src/test-utils/answer-watchers.ts` (new): the shared multi-subscriber `firebase-db` mock, used here and by the page-level tests in the banner step
- `src/components/activity-page/activity-page-content.tsx`: wrap the sections in the provider
- `src/components/single-page/single-page-content.tsx`: wrap each page's sections in their own provider

**Estimated diff size**: ~300 lines

```tsx
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Page, SectionType } from "../../types";
import { watchAnswer } from "../../firebase-db";
import { ActivityLayouts } from "../../utilities/activity-utils";
import { queryValue } from "../../utilities/url-query";
import { isOfferingLocked } from "../../utilities/portal-data-utils";
import { PortalDataContext } from "../portal-data-context";
import {
  GateStatus, kDisableQuestionsAfterParam, nextGateStatus, parseQuestionGatingParam, planDisabledQuestions, planTabBanners
} from "../../utilities/disabled-questions";

export type BannerState = "locked" | "unlocked";

export interface IQuestionLock {
  /** Out of reach of pointer, keyboard and assistive technology. */
  disabled: boolean;
  /** Shown grayed out with its heading marked locked. False while the gate is still loading. */
  locked: boolean;
  /** Set on the first question a gating item disables, unless a notebook tab banner covers it. */
  banner?: BannerState;
}

const kUnlocked: IQuestionLock = { disabled: false, locked: false };

// queryValue throws on a repeated parameter, which would unmount the page during render.
const readQuestionGatingSettings = () => {
  try {
    return parseQuestionGatingParam(queryValue(kDisableQuestionsAfterParam));
  } catch (e) {
    console.warn(`Ignoring ${kDisableQuestionsAfterParam}: ${e}`);
    return {};
  }
};

const bannerFor = (status: GateStatus): BannerState | undefined =>
  status === "locked" ? "locked" : status === "unlockedDuringVisit" ? "unlocked" : undefined;

interface IDisabledQuestions {
  getLock: (refId: string) => IQuestionLock;
  getTabBanner: (section: SectionType) => BannerState | undefined;
}

const DisabledQuestionsContext = React.createContext<IDisabledQuestions>({
  getLock: () => kUnlocked,
  getTabBanner: () => undefined
});

export const useQuestionLock = (refId: string) => useContext(DisabledQuestionsContext).getLock(refId);

export const useTabBanner = (section: SectionType) => useContext(DisabledQuestionsContext).getTabBanner(section);

interface IProps {
  page: Page;
  activityLayout: number;
  teacherEditionMode?: boolean;
}

export const DisabledQuestionsProvider: React.FC<IProps> = ({ page, activityLayout, teacherEditionMode, children }) => {
  const portalData = useContext(PortalDataContext);
  const active = !teacherEditionMode && !isOfferingLocked(portalData);
  const plan = useMemo(
    () => active ? planDisabledQuestions(page, activityLayout, readQuestionGatingSettings()) : {},
    [active, page, activityLayout]
  );
  const tabs = useMemo(
    () => activityLayout === ActivityLayouts.Notebook ? planTabBanners(page, plan) : {},
    [activityLayout, page, plan]
  );
  const gatingKey = Object.keys(plan).join(",");
  const [statuses, setStatuses] = useState<Record<string, GateStatus>>({});

  useEffect(() => {
    if (!gatingKey) return;
    const gatingRefIds = gatingKey.split(",");
    setStatuses(Object.fromEntries(gatingRefIds.map(refId => [refId, "loading" as GateStatus])));
    const unsubscribes = gatingRefIds.map(refId => watchAnswer(refId, wrappedAnswer => {
      const hasSavedState = wrappedAnswer?.interactiveState != null;
      setStatuses(prev => ({ ...prev, [refId]: nextGateStatus(prev[refId] ?? "loading", hasSavedState) }));
    }));
    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [gatingKey]);

  const value = useMemo((): IDisabledQuestions => {
    const locks: Record<string, IQuestionLock> = {};
    const tabStatuses = new Map<SectionType, GateStatus[]>();
    Object.entries(plan).forEach(([gatingRefId, questionRefIds]) => {
      const status = statuses[gatingRefId] ?? "loading";
      const isLoading = status === "loading";
      const isLocked = status === "locked";
      const gateTabs = tabs[gatingRefId] ?? [];
      gateTabs.forEach(tab => tabStatuses.set(tab, [...(tabStatuses.get(tab) ?? []), status]));
      const firstInTabWithBanner = gateTabs.some(tab => tab.embeddables.some(e => e.ref_id === questionRefIds[0]));
      questionRefIds.forEach((refId, index) => {
        const lock = locks[refId] ?? { ...kUnlocked };
        lock.disabled = lock.disabled || isLoading || isLocked;
        lock.locked = lock.locked || isLocked;
        if (index === 0 && !firstInTabWithBanner) {
          lock.banner = bannerFor(status) ?? lock.banner;
        }
        locks[refId] = lock;
      });
    });
    const tabBanners = new Map<SectionType, BannerState | undefined>();
    tabStatuses.forEach((tabGateStatuses, tab) => {
      tabBanners.set(tab, tabGateStatuses.includes("locked")
        ? "locked"
        : tabGateStatuses.includes("unlockedDuringVisit") ? "unlocked" : undefined);
    });
    return {
      getLock: (refId: string) => locks[refId] ?? kUnlocked,
      getTabBanner: (section: SectionType) => tabBanners.get(section)
    };
  }, [plan, tabs, statuses]);

  return <DisabledQuestionsContext.Provider value={value}>{children}</DisabledQuestionsContext.Provider>;
};
```

Tab banners are keyed by section object: `planTabBanners` returns the page's own section objects, the same ones `ActivityPageContent` passes to each `Section`. A tab reached by a gating item that is still loading and by none that is locked shows no banner until the read returns, matching how its questions are disabled but not grayed meanwhile.

`gatingKey` is the effect's only input, so the watch is torn down and rebuilt only when the set of gating items changes, and the effect depends on exactly what it reads. With no gating items the effect returns before setting state, so a page without the parameter renders once, as it does without the provider. `watchAnswer` reports `null` when the gating item has no answer document, which counts as no saved state.

In `ActivityPageContent.render`, inside `EmbeddableVisibilityProvider`:

```tsx
<DisabledQuestionsProvider page={page} activityLayout={this.props.activityLayout} teacherEditionMode={this.props.teacherEditionMode}>
  <div className="sections">
    {renderTabs && this.renderTabs(sections)}
    {this.renderSections(sections, totalPreviousQuestions, renderTabs)}
  </div>
</DisabledQuestionsProvider>
```

In `SinglePageContent.renderPageContent`, the `React.Fragment` around a page's sections becomes a provider for that page, so a gating item's reach ends with its authored page even though every page shows on one screen:

```tsx
<DisabledQuestionsProvider key={index} page={page} activityLayout={activity.layout} teacherEditionMode={teacherEditionMode}>
  { page.sections.map((section, idx) => /* unchanged */) }
</DisabledQuestionsProvider>
```

Tests (`disabled-questions-context.test.tsx`) mock `../../firebase-db` with `firebaseDbMock` from the new `src/test-utils/answer-watchers.ts`, whose `watchAnswer` keeps every callback per ref id and whose `report` sends an answer to all of them, set the query per test with `window.history.replaceState({}, "", "/?override:disableQuestionsAfter=...")` (jsdom does not navigate on a `location.search` assignment) and reset it in `afterEach`, and render a probe component that prints `useQuestionLock` for three ref ids (a question before the gate, the first question after it, a later question after it):
- No parameter: all three unlocked, `watchAnswer` never called.
- Parameter, before any report: the two later questions are `disabled` but not `locked`, no banner; the earlier question is untouched.
- Report `null`: both later questions `disabled` and `locked`, banner `locked` on the first only.
- Then report saved state: all unlocked, banner `unlocked` on the first.
- Report saved state first: all unlocked with no banner, and a later `null` report changes nothing.
- Teacher Edition, and a locked offering (portal data with `offering.locked`): no `watchAnswer` call, nothing disabled.
- Unmount removes the provider's subscription.
- Notebook layout, three tabs `[m, q1] [q2] [q3]` with a probe that also prints `useTabBanner` for each tab: after a `null` report, tabs 2 and 3 show `locked` and tab 1 none, and `q1` carries the question banner; after a saved-state report, tabs 2 and 3 show `unlocked`. With `m` last in tab 1 (`[m] [q1] [q2]`), `q1` carries no question banner because tab 2's banner covers it.
- A second gating item inside a covered tab (`[a, q1] [b, q2] [q3]`): with `a` unlocked during the visit and `b` locked, tab 2 shows `locked`, not `unlocked`, and `q2` carries no question banner, so tab 2 has one banner and it does not say "unlocked" above a locked question.
- Two gating items reaching the same tab: `locked` while either is locked, `unlocked` once both are open and one opened during the visit, and no banner when both had saved state on load.
- Outside the notebook layout, the same pages give no tab banners and the question banner as before.
- A repeated parameter (`?override:disableQuestionsAfter=a&override:disableQuestionsAfter=b`) renders the children with nothing disabled and warns, rather than throwing.

---

### Make disabled questions unusable

**Summary**: `Embeddable` reads its lock and passes it down; the question is grayed, its heading says it is locked, and everything else is inert. `inert` goes through a small hook because React 16 and `@types/react` 16 do not know the prop.

**Files affected**:
- `src/utilities/use-inert.ts` (new) and `use-inert.test.tsx` (new)
- `src/components/activity-page/embeddable.tsx`: read `useQuestionLock`, add the `disabled-question` class, pass `disabled` and `locked` to `ManagedInteractive`
- `src/components/activity-page/embeddable.scss`: grayed style
- `managed-interactive/managed-interactive.tsx`: accept `disabled` and `locked`, pass them to the header, click-to-play and the inline iframe runtime (not the dialog overlay's runtime, which opens only at the interactive's request)
- `managed-interactive/managed-interactive-header.tsx`: hint button `disabled`; visually hidden " (locked)" in the heading
- `managed-interactive/iframe-runtime.tsx`: `useInert` on the root `.iframe-runtime` element
- `managed-interactive/click-to-play.tsx`: `useInert` on its root
- `managed-interactive/managed-interactive.scss`: a `.visually-hidden` rule nested under `.managed-interactive .header`, scoped like the one in `chat.scss` so a feature stylesheet does not add a global utility
- tests in `embeddable.test.tsx`, `managed-interactive-header.test.tsx`, `iframe-runtime.test.tsx`, `click-to-play.test.tsx`

**Estimated diff size**: ~200 lines

```ts
import { RefObject, useEffect } from "react";

/** Sets the `inert` attribute on the referenced element while `active`; React 16 does not know the `inert` prop. */
export const useInert = (ref: RefObject<HTMLElement>, active: boolean) => {
  useEffect(() => {
    const element = ref.current;
    if (!element || !active) return;
    element.setAttribute("inert", "");
    return () => element.removeAttribute("inert");
  }, [ref, active]);
};
```

Both roots get a new local ref for the hook (`IframeRuntime`'s existing refs point at the iframe and the sentinels, `ClickToPlay` has none). `inert` goes on the iframe runtime's root rather than the iframe so the sentinels, "Clear & start over" and feedback inside it go too; the heading lives in `ManagedInteractiveHeader`, a sibling, so it stays readable. The hint button uses the native `disabled` attribute, which removes it from the tab order and pointer while still exposing it to assistive technology as unavailable. While a gate is loading `disabled` is set without `locked`, so the question is unusable for that moment but not grayed and not announced as locked.

In `Embeddable`:

```tsx
const lock = useQuestionLock(embeddable.ref_id);
// ...
const embeddableClasses = classNames("embeddable", /* existing */, {"disabled-question": lock.locked});
// ...
<ManagedInteractive ... disabled={lock.disabled} locked={lock.locked} />
```

```scss
.embeddable.disabled-question .embeddable-sub-two {
  filter: grayscale(1);
  opacity: 0.5;
}
```

In the header, inside the `h2` after `headingContent`: `{locked && <span className="visually-hidden"> (locked)</span>}`.

Tests:
- `use-inert.test.tsx`: attribute set when active, absent when inactive, removed when `active` turns false and on unmount.
- `iframe-runtime.test.tsx`: with `disabled`, the `[data-cy="iframe-runtime"]` element has `inert`; without, it does not.
- `click-to-play.test.tsx`: same for `[data-cy="click-to-play"]`.
- `managed-interactive-header.test.tsx`: with `locked`, the heading's accessible name ends in "(locked)" and the hint button is disabled; with `disabled` only, the button is disabled and the heading has no suffix.
- `embeddable.test.tsx`: with `useQuestionLock` mocked (`jest.mock("./disabled-questions-context")`) to return `{disabled: true, locked: true}`, an `Embeddable` has the `disabled-question` class and an inert iframe runtime; returning the unlocked value, it has neither.

---

### Show the banner

**Summary**: The banner component, its icons, and its placement: before the first question each gating item disables, and in the notebook layout, under the tabs of each later tab the gating item reaches.

**Files affected**:
- `src/assets/svg-icons/icon-block.svg` (new): the Material Icons "block" glyph (circle with a slash), from the same set and in the same 24x24 form as `icon-reload.svg`; the unlocked state reuses `icon-check-circle.svg`
- `src/components/activity-page/disabled-questions-banner.tsx` (new), `.scss` (new), `.test.tsx` (new)
- `src/components/activity-page/embeddable.tsx`: render the banner as the first child of the embeddable's root when `lock.banner` is set
- `src/components/activity-page/section.tsx`: read `useTabBanner(section)` and render the tab banner as the first child of the section element
- `src/components/activity-page/section.scss`: make the max-aspect-ratio primary-column cell a flex column
- `src/components/activity-page/section.test.tsx`: tab banner placement
- `src/components/activity-page/activity-page-content.test.tsx` and `src/components/single-page/single-page-content.test.tsx`: end-to-end tests through the provider

**Estimated diff size**: ~200 lines

```tsx
import React from "react";
import classNames from "classnames";
import IconBlock from "../../assets/svg-icons/icon-block.svg";
import IconCheckCircle from "../../assets/svg-icons/icon-check-circle.svg";
import { BannerState } from "./disabled-questions-context";

import "./disabled-questions-banner.scss";

export const kLockedBannerText = "Run the Wildfire Explorer and Hazbot Analysis, then answer these questions!";
export const kUnlockedBannerText = "The questions are now unlocked!";

interface IProps {
  state: BannerState;
  /** Spans the whole notebook tab, under the tabs, rather than one question's cell. */
  tab?: boolean;
}

export const DisabledQuestionsBanner: React.FC<IProps> = ({ state, tab }) => {
  const Icon = state === "locked" ? IconBlock : IconCheckCircle;
  return (
    <div className={classNames("disabled-questions-banner", state, { tab })} role="status" data-cy="disabled-questions-banner">
      <Icon className="icon" aria-hidden="true" focusable="false" />
      <span>{state === "locked" ? kLockedBannerText : kUnlockedBannerText}</span>
    </div>
  );
};
```

`role="status"` makes the element a polite live region; the same element stays mounted when the state changes, so the new text is announced. The banner is the first child of the `[data-cy="embeddable"]` root, ahead of `embeddable-sub-one` and `embeddable-sub-two`. That puts it in the question's own grid or flex cell, so it takes the question's width in every layout and keeps half-width pairs side by side, and it stays outside the grayed `embeddable-sub-two` and the inert iframe runtime:

```tsx
<div className={embeddableClasses} data-cy="embeddable" key={embeddable.ref_id} ref={targetDiv}>
  { lock.banner && <DisabledQuestionsBanner state={lock.banner} /> }
  { linkedPluginEmbeddable && <div className={"embeddable-sub-one"} ref={embeddableWrapperDivTarget}></div> }
  <div className={"embeddable-sub-two"} ref={embeddableDivTarget}>
    { qComponent }
  </div>
</div>
```

Because the banner is inside the element `Embeddable` registers with the visibility tracker, a banner that makes the cell taller (and so moves the questions below it) fires the tracker's `ResizeObserver` on that cell, and visibility is measured again under the existing `embeddableResize` trigger. Where the cell keeps its height, nothing below it moves.

In the notebook layout, a tab after the gating item's tab shows its banner under the tabs instead, since the banner before the first disabled question is out of sight once the student switches tabs. `Section` renders it as the first child of the section element in both its single-column and split branches:

```tsx
const tabBanner = useTabBanner(section);
// ...
{ tabBanner && <DisabledQuestionsBanner state={tabBanner} tab /> }
```

Notebook sections are CSS grids, so `.disabled-questions-banner.tab { grid-column: 1 / -1; }` gives the banner its own first row across the whole tab, and the columns below keep their widths. It hides with its tab because it lives inside the tab's section. Checked in the running app on `sample-activity-notebook` page 2 (40-60 tabs) and `sample-activity-all-question-interactives-notebook` page 2 (full-width tabs): the banner spanned the tab (1024px of a 1044px tab), and the 371px and 643px columns kept their widths and moved down. The notebook's width is fixed, so a narrow viewport changes nothing. The first tab is selected on load, so later-tab banners appear while their tab is hidden and the existing `tabChange` measurement covers them when the tab is shown.

A max-aspect-ratio question in a primary column has a cell fixed at `98vh` whose `.embeddable-sub-two` is `height: 100%`, so a banner on top would push the interactive past the bottom of the cell. The cell becomes a flex column, as the full-width max-aspect-ratio cell already is, so the body shrinks to make room. Without a banner this changes no sizes:

```scss
.column.primary.max-aspect-ratio .embeddable.primary {
  display: flex;
  flex-direction: column;
}
```

The SCSS uses `$cc-charcoal` (`#3f3f3f`) text on `$cc-charcoal-light3` (`#F4F4F4`), 9.6:1, with a 32px icon filled `$cc-charcoal`, the same colors in both states. The locked text is the ticket's Hazbot wording, standing in for LARA-226's authored text.

Tests (`disabled-questions-banner.test.tsx` and `embeddable.test.tsx`): the locked and unlocked texts (asserted against the exported constants); one `role="status"` element whose text changes on rerender from locked to unlocked without remounting (same DOM node); the icon is `aria-hidden`; the banner's class changes from `locked` to `unlocked` (Jest maps every `.svg` import to one file stub, so the icon swap itself is checked in the browser, not asserted); an `Embeddable` whose lock has `banner: "locked"` renders the banner as the first child of its `[data-cy="embeddable"]` element, outside `.embeddable-sub-two`, and one without renders none; with `useTabBanner` mocked to `"locked"`, a split-layout and a single-column `Section` each render a banner with the `tab` class as the section element's first child, and with it returning `undefined` they render none. In `activity-page-content.test.tsx`, with `?override:disableQuestionsAfter=<model ref_id>` set through `history.replaceState`, a page `[model, q1]` shows the locked banner and an inert iframe runtime for q1 after a `null` report, then the unlocked banner and no `inert` after a saved-state report. Neither page-level test file mocked `firebase-db`, so both use the shared `firebaseDbMock` from the provider step: `watchAnswer` keeps a list of callbacks per ref id and a report goes to all of them, because the model's id has two subscribers (the provider and the model's own `ManagedInteractive`). Each test also reports `null` for q1 before asserting on it, since `ManagedInteractive` renders "Loading..." and no iframe runtime until its own answer arrives. This is the only test that fails if the provider is not wired into `ActivityPageContent`, since the `Embeddable` tests mock the hook. `single-page-content.test.tsx` does the same for a two-page single-page activity, gating an item on the first page: the question after it locks and the question on the second page does not, which fails if the providers are missing or if one provider spans the whole activity.

---

### Add a demo sample activity

**Summary**: A built-in sample activity made for this feature, so the review link opens pages where every gating item is a Wildfire build that saves state and therefore unlocks. The existing samples cover the layouts, but their only full-width Wildfire page has one question, and their multi-section Wildfire page runs `v1.6.0`, which never saves.

**Files affected**:
- `src/data/version-2/sample-new-sections-disabled-questions.json` (new)
- `src/data/index.ts`: register it as `sample-disabled-questions`
- `src/utilities/disabled-questions.test.ts`: plan the sample's pages

**Estimated diff size**: ~800 lines, almost all JSON (each copied question carries its library interactive's data)

The activity is a version 2 (sections) export with `layout: 0`. Its Wildfire items are `MwInteractive`s copied from `211760-MwInteractive` in `sample-new-sections.json`, with `url` set to `https://models-resources.concord.org/wildfire-model/branch/master/index.html` and `enable_learner_state: true`; its questions copy the Open Response (`4343-ManagedInteractive`) and Multiple Choice (`4340-ManagedInteractive`) embeddables from the same file. Every copy gets a new `ref_id` in the `9100` range so nothing collides with other samples.

| Page | Layout | Items in order | With every Wildfire item gated |
|---|---|---|---|
| 1, "Model first" | full-width | text, Wildfire `9101`, open response, text, multiple choice | Both questions lock; the text does not |
| 2, "Model on the left" | 60-40 | Wildfire `9102` (primary), open response (primary), two multiple choice (secondary) | All three lock |
| 3, "Model on the right" | 40-60, then full-width | multiple choice (secondary), Wildfire `9103` (primary), open response (primary); then a full-width open response | The left-column question stays open; the other two lock |
| 4, "Two models" | full-width | Wildfire `9104`, open response, Wildfire `9105`, multiple choice | Two banners; the last question waits for both models |

One link opens the whole demo, since the parameter applies page by page:
`?activity=sample-disabled-questions&preview&override:disableQuestionsAfter=9101-MwInteractive,9102-MwInteractive,9103-MwInteractive,9104-MwInteractive,9105-MwInteractive`

A test in `disabled-questions.test.ts` loads the sample from `src/data` and asserts `planDisabledQuestions` for each page against the table above, so the sample cannot drift from what the demo instructions promise. The same test asserts that no `ref_id` repeats on any of the sample's pages, since the lock is keyed by `ref_id` and a repeated id would lock every copy.

---

### Document the parameter

**Summary**: README entry for `override:disableQuestionsAfter` and the review instructions.

**Files affected**:
- `README.md`: one line under "Url Parameters", after `override:locked`

**Estimated diff size**: ~5 lines

```
* override:disableQuestionsAfter={ref_id[,ref_id]}: treats each named interactive as authored with "questions after this item start disabled", in addition to any authored setting. On the page holding each named interactive, the questions after it are disabled under a banner until that interactive has saved state; for the Wildfire model that is the end of its first run. In a single-page activity the reach ends with the authored page. Not applied in Teacher Edition or on a locked offering. The `sample-disabled-questions` activity is built for it. Useful for development/testing.
```

The review link (the one-link demo above, plus the layout pages from the requirements' Demo pages table) goes in the pull request description, with the note that the demo unlocks when a run ends, Hazbot analysis or not.

## Open Questions

### RESOLVED: Judgment call: what does the page show while a gating item's saved state is loading?
**Options considered**:
- A) Disabled but not grayed and no banner.
- B) The full locked state, then a silent unlock if state exists.
- C) Usable until the state arrives.

**Decision**: A. B flashes the locked state at a returning student, which the requirements rule out; C lets a fast click through. The load is a single Firestore read, so the moment is brief. The requirements' "stay locked while loading" line was reworded to match.

### RESOLVED: Judgment call: apply the disabled state inside each component, or with one wrapper around the question body?
**Options considered**:
- A) `inert` on the iframe runtime and click-to-play roots, native `disabled` on the hint button.
- B) A new wrapper `div` around everything after the header, made inert.

**Decision**: A. `ManagedInteractive`'s layout and its `.managed-interactive` styles target its existing children, and a new wrapper changes the structure every interactive renders through. Three local changes keep the DOM as it is when nothing is disabled.

### RESOLVED: Judgment call: where does the plan live?
**Options considered**:
- A) A new `src/utilities/disabled-questions.ts`.
- B) `page-walk.ts`, beside the walk it uses.

**Decision**: A. `page-walk.ts` must stay importable by the report-service copy of `chat-context.ts`, and the plan is only needed by the Activity Player. The new module imports from `page-walk` and adds nothing to it.

## Self-Review

### Senior Engineer

#### RESOLVED: A repeated parameter blanks the page
`queryValue` throws when a parameter appears twice (confirmed with a throwaway Jest test: `?override:disableQuestionsAfter=a&override:disableQuestionsAfter=b` throws, `?override:disableQuestionsAfter=a,b` returns `"a,b"`). The provider read it inside `useMemo` during render, and the app has no error boundary (`componentDidCatch` appears nowhere in `src`), so a mistyped review link would unmount the whole page. Fixed: `readQuestionGatingSettings` catches, warns, and disables nothing; a test covers it.

#### RESOLVED: `useInert` needs refs the components do not have
`IframeRuntime`'s refs point at the iframe (`composedIframeRef`) and the two sentinels, and `ClickToPlay` takes no ref. Fixed: each gets a local root ref for the hook, noted in the step.

---

### Test Writer

#### RESOLVED: No test fails if the provider is never wired in
The `Embeddable` tests mock `useQuestionLock` and the provider tests use a probe component, so deleting the `DisabledQuestionsProvider` wrapper from `ActivityPageContent` would leave the suite green while the feature did nothing. Fixed: an `activity-page-content.test.tsx` case drives the real provider with a mocked `watchAnswer` and asserts the banner and `inert` through the locked and unlocked reports.

---

### WCAG Accessibility Expert

#### RESOLVED: Banner colors were deferred
The step left the banner's colors to be "checked when picked", so nothing pinned the 4.5:1 requirement. Fixed: `$cc-charcoal` on `$cc-charcoal-light3`, computed at 9.6:1, in both states.

---

### Cross-reference (after the demo-page scan)

#### RESOLVED: Single-page activities never reached the provider
Scanning the built-in samples showed `SinglePageContent` renders each page's `Section`s itself, so a provider in `ActivityPageContent` alone left single-page activities untouched and the feature silently off there. Decided by Doug Martin on 2026-10-06: support them with one provider per authored page. Added to the provider step with an end-to-end test that fails if the providers are missing or merged into one.

---

### Second review pass (2026-10-06)

Each finding below was checked against the current code before it was written down. Three throwaway checks backed them up and were then deleted: a Jest test that ran the planned `getSectionColumns` and `planDisabledQuestions` on every built-in sample (old-format samples went through `convertLegacyResource`), a Playwright page using `section.scss`'s grid rules, and a Jest test of how `queryValue` responds to `window.location.search` versus `history.replaceState`.

### QA Engineer

#### RESOLVED: Three Demo pages rows rely on sample pages that reuse `ref_id`s
`sample-new-sections` page 6 has `327-ManagedInteractive` twice and `328-ManagedInteractive` three times, and page 9 has `4343` twice and `327` and `328` three times each. The plan and `useQuestionLock` are keyed by `ref_id`, so when the same id shows up before and after a gate, both copies follow the copy after it. On page 6 the plan is `{211760: [327]}`, which locks the left-column `327` too and puts a banner in front of both copies. On page 9 all five left-column questions in the 30-70 section (ids `327` and `328`) lock, and with two gates the `4344` banner shows twice, before both copies of `4343`. The table's "stay open" counts for the Responsive 30-70, Several sections, and Two gating items rows are therefore wrong. The other seven rows came out as the table says. Real LARA exports have unique ids, so this only affects the samples. Suggested fix: remove those three rows, since `sample-disabled-questions` already covers split columns, several sections, and two gates with unique ids. Also add an assertion that `ref_id`s are unique on each page to the sample's plan test, so the new sample can't run into the same problem.

Resolved without a decision: the three rows are removed from the requirements' Demo pages table, which now says why repeated-id pages are left out, and the sample's plan test asserts unique ids per page.

#### RESOLVED: Setting `window.location.search` in Jest doesn't change the query
The provider tests say to "set `window.location.search` per test". In this jsdom, that assignment logs "Not implemented: navigation (except hash changes)" and `queryValue` still returns `undefined`. Suggested fix: use `window.history.replaceState({}, "", "/?override:disableQuestionsAfter=...")` as `auth-utils.test.ts` does, reset it in `afterEach`, and do the same in the `activity-page-content` and `single-page-content` tests.

Resolved without a decision: the provider and end-to-end tests set the query with `history.replaceState` and reset it after each test.

---

### Senior Engineer

#### RESOLVED: In a full-width section the banner takes one grid column out of ten
`.section` is a 10-column grid. Only `.embeddable.full-width` gets `grid-column: span 10`, so a banner rendered as a sibling of the embeddable is auto-placed into a single column. With the real rules on a 1000px page, the banner measured 89px wide next to a 984px question. This happens on demo pages 1 and 4 and on every single-page activity, which also gets the `full-width` section class. In front of a half-width question, the banner lands next to the half-width item before it and pushes the disabled question onto the next row. Suggested fix: give `.disabled-questions-banner` `grid-column: 1 / -1` (it has no effect inside the flex columns of split and responsive sections). Accept that a banner in front of the second item of a half-width pair breaks the pair onto separate rows. Check it in the browser, since Jest doesn't apply CSS.

Decided by Doug Martin on 2026-10-07: the banner goes inside the question's cell (option B) instead of as a sibling with `grid-column: 1 / -1` (option A). Both were measured in the running app on 15 sample activities at 1280px and 760px (688 question placements) across full-width, 60-40, 40-60, 70-30 (60-40 with its class swapped), 30-70, the responsive layouts, carousel, notebook tabs, single-page, half-width, and max-aspect-ratio. A broke every half-width pair holding a question, with a 1044px banner over a 517px question. B matched the question's width everywhere. Its one failure, a max-aspect-ratio cell in a responsive primary column that pushed the interactive 48px out of the cell, is fixed by the flex-column rule now in the plan (checked to change no sizes without a banner). The 7px column shift seen on notebook pages came from a scroll container gaining its scrollbar and happened under both options.

#### RESOLVED: A fourth copy of the visually-hidden rule, possibly a global one
The plan adds a `.visually-hidden` rule to `managed-interactive.scss`. The clip pattern already exists in `app.scss` (`.skip-link`), `chat.scss`, and `iframe-runtime.scss`. `chat.scss` has a comment explaining that it nests its `.visually-hidden` because a bare one in a feature stylesheet turned into a global utility owned by that feature. Suggested fix: nest the new rule under `.managed-interactive .header`, following `chat.scss`. Optionally, add a `visually-hidden` mixin to `vars.scss` and use it in the new rule, leaving the existing copies for another change.

Resolved without a decision: the rule is nested under `.managed-interactive .header`, following `chat.scss`. A shared mixin is left for a change that also converts the existing copies.

---

### Education Researcher

#### RESOLVED: The banner moves questions down without a new visibility measurement
The AP-140 tracker measures again on scroll, window resize, `ResizeObserver` size changes of each embeddable, tab changes, and column toggles. Inserting a banner changes where the following questions sit but not their size, so none of those triggers fire. The banner appears when the gate's first read comes back empty, which can happen after the page's first visibility measurement, so the logged visibility stays based on the old layout until the student scrolls. `Section` already handles its own layout shift by calling `visibility?.queue("columnToggle")`. Suggested fix: queue a measurement when a banner mounts. The open choice is whether that uses a new trigger name (which adds a value to the logged vocabulary) or an existing one (which logs a misleading cause).

Resolved by the same decision: with the banner inside the registered cell, a taller cell fires the tracker's existing `ResizeObserver` (confirmed in the browser), so no new trigger or `queue` call is needed.

---

### WCAG Accessibility Expert

#### RESOLVED: A question with no header can't say it is locked
`ManagedInteractive` hides the header (`hideQuestionHeader`) when a question has no number shown, no name, no hint, isn't in the notebook layout, and has no plugin that needs a header. A hidden-number question with no name meets all of those, and hidden-number questions are disabled. When such a question is disabled there is no `h2` to hold " (locked)", and the rest of it is inert, so assistive technology gets nothing from it. That contradicts the requirement that the heading "says the question is locked". Suggested fix: change the requirement to "when it has a heading". A question with no heading has none for sighted students either, and the banner before the group explains the lock.

Resolved without a decision: the requirement now applies the locked heading only when the question has a heading.

---

### Student

#### RESOLVED: Collapsing a column can hide the banner while grayed questions stay visible
`Section` doesn't render a collapsed secondary column's embeddables at all (`!isSecondaryCollapsed && renderEmbeddables(...)`). If a gate's first disabled question is in a collapsible secondary column and the student collapses it, the banner goes with it, while disabled questions in the other column or later sections stay grayed with nothing explaining why. Columns start expanded, and only the student can collapse one. Suggested fix: accept this for the demo and note it in Technical Notes so design review knows about it.

Resolved without a decision: accepted for the demo and noted under Collapsed columns in the requirements' Technical Notes.

---

### Checked and not raised

- The planned `getSectionColumns` matches `Section`'s inline logic (stacked, single column, and column order) for every section in every built-in sample under all three activity layouts: 0 mismatches. That includes the old-format `l-6040`, `r-4060`, `l-7030`, and `l-responsive` layouts after conversion.
- Banner contrast: `#3f3f3f` on `#F4F4F4` computes to 9.57:1.
- `ActivityPageContent` is keyed per page in `app.tsx`, so gate status never carries over from one page to the next.
- `setBackgroundInert` only touches siblings of `#expandable-container`, so it never adds or removes `inert` on an iframe runtime.
- React and `@types/react` are 16.14, and neither knows the `inert` prop, so the attribute hook is needed.

---

### Third review pass (2026-10-07)

Each finding was checked against the current code first. Three throwaway Jest tests backed them up and were then deleted: one ran the planned ordering on `sample-activity-notebook` page 2 and round-tripped the parameter through `getPageHref`, one rendered the plan's provider effect with no parameter and counted consumer renders, and one rendered `ActivityPageContent` over a `[model, q1]` page with a multi-subscriber `watchAnswer` mock.

### Student

#### RESOLVED: In the notebook layout, later tabs show grayed questions with no banner
The banner sits only before a gate's first disabled question. Notebook sections are tabs and only one shows at a time (`hidden-tab`), so with page scope a student who opens a later tab sees grayed questions and nothing explaining them. On `sample-activity-notebook` page 2, gating `893-ManagedInteractive` (tab 1) locks `894`, `895` and `896` in tab 1, `889` in tab 2 and `891` in tab 3, and the only banner is before `894`. The requirements' Demo pages table lists this page, so reviewers will see it. Options: A) in the notebook layout, also put a banner before the first disabled question in each later tab (the plan returns that anchor per section, and `getLock` sets `banner` on it); B) accept for the demo and note it under Technical Notes beside Collapsed columns; C) a banner before the first disabled question of every later section in every layout. Suggested: A, since tabs are the one layout where the first banner is guaranteed off screen; C adds banners to stacked full-width sections that are already in view of the first one.

Decided by Doug Martin on 2026-10-07: a variant of A, with the later tabs' banner placed full width under the tabs rather than before each tab's first disabled question. Tried in the running app with a stand-in banner on 40-60 and full-width notebook tabs: it spans the tab and leaves the columns' widths unchanged. The requirements' Banner section and Demo pages table, the planning, provider and banner steps now cover it, including one banner per tab when several gating items reach it.

---

### Performance Engineer

#### RESOLVED: Without the parameter, every embeddable renders twice on page load
The provider's effect always calls `setStatuses(Object.fromEntries(...))`, which with no gating items sets a new `{}`. React compares state with `Object.is`, so the provider re-renders, `getLock` is rebuilt, and every `Embeddable` (and its `ManagedInteractive`) renders again. Measured with the plan's effect: 2 consumer renders with no parameter, 1 with a `if (!gatingKey) return;` guard. Nothing visible changes, but the requirement is that pages without the parameter render exactly as today. Suggested fix: return early from the effect when `gatingKey` is empty. The "No parameter: `watchAnswer` never called" test still holds; add a render-count assertion only if a cheap probe exists, otherwise rely on the guard being a one-line early return.

Resolved without a decision: the provider's effect returns early when there are no gating items.

---

### QA Engineer

#### RESOLVED: The end-to-end tests need q1's own answer report, not just the gate's
`ManagedInteractive` shows "Loading..." and renders no `IframeRuntime` until its own `watchAnswer` callback fires. Rendering `ActivityPageContent` over `[model, q1]` showed one `[data-cy="iframe-runtime"]` (the model's) after reporting only the model, and two after reporting q1 too. With the provider in place the model's ref id also has two subscribers (the provider and the model's own `ManagedInteractive`). So the `activity-page-content` and `single-page-content` tests as written ("shows ... an inert iframe runtime for q1 after a `null` report") fail unless the mock keeps every callback per ref id and the test reports to q1's watcher as well as the gate's. A mock that keeps one callback per id silently drops whichever subscribed first. Neither page-level test file mocks `firebase-db` today, so the mock is new. Suggested fix: state in the step that the mock stores a list of callbacks per ref id, reports to all of them, and that each test reports `null` for q1 before asserting on its runtime.

Resolved without a decision: the banner step's end-to-end test description now specifies the multi-subscriber mock and the report to q1.

---

### Product Manager

#### RESOLVED: The parameter's fate after LARA-226 is not stated
The requirements say the parameter stands in "until then", and Out of Scope describes how the later pull request reads `question_gating`, but neither file says whether `override:disableQuestionsAfter` is removed then or kept as a test override (as `override:locked` is). The README entry and the review links depend on the answer. Options: A) the later pull request removes it, along with the README line and `parseQuestionGatingParam`; B) it stays as a development override that adds gating on top of the authored field. Suggested: A, stated in Out of Scope, since a second way to set the value is a second source of truth once the field exists.

Decided B by Doug Martin on 2026-10-07: the parameter stays as a development override that adds gating on top of the authored field. It is named `override:disableQuestionsAfter` from this pull request on, so the review links and README entry keep working; `query-string` encodes the colon as `%3A` when page links are rebuilt and decodes it back. Background, Out of Scope, the planning step and the README line say so.

---

### Checked and not raised (third pass)

- Firestore does not raise an empty cached snapshot before the server answers when online with an empty cache, so a returning logged-in student does not see a locked flash; `preview` is offline, where the first snapshot comes from the cleared cache and is correctly empty.
- `getPageHref` re-encodes the comma as `%2C` and `queryValue` decodes it, so the parameter survives page navigation unchanged.
- The hint panel is `visibility: hidden` when collapsed, so its close button is not reachable while the hint button is disabled.
- `DialogOverlay` and `Lightbox` render through `react-modal` portals, so the grayed style's `filter` and `opacity` cannot clip them; they open only at the interactive's request.
- Two gates never share a first disabled question: an earlier gate's list always contains the later gate itself, so banner anchors cannot collide.
- `useQuestionLock` has to be called before `Embeddable`'s early `return null`; `react-hooks/rules-of-hooks` is enabled in `.eslintrc.js`, so lint catches a misplaced call.
- `SinglePageContent` renders every section, hidden ones included, while the plan walks visible sections only. No built-in single-page sample has a hidden section, and the mismatch predates this work, so it is left for a separate fix.
- `Section.renderCollapsibleHeader` keeps its own list of layouts with the collapsible column on the left, which disagrees with `leftIsPrimary` for `responsive-2-column` and `responsive`. It controls only the arrow direction, predates this work, and folding it into the helper would change behavior.

---

### Focused check of the notebook tab banners (2026-10-07)

The tab-banner code was copied out of this spec into throwaway modules and run in Jest over hand-built notebook pages, then deleted.

### Senior Engineer

#### RESOLVED: A gating item inside a covered tab adds a second, contradicting banner
On `[a, q1] [b, q2] [q3]`, `a`'s tab banner covers tab 2, and `b`'s first disabled question `q2` is in `b`'s own tab, so `q2` also got a question banner: two banners in tab 2, against the requirement. Worse, with `a` unlocked during the visit and `b` locked, tab 2's banner said "The questions are now unlocked!" directly above a locked `q2`, because `b` did not contribute to that tab's state. Fixed without a decision: `planTabBanners` adds a gating item's first-question tab to its list when another gating item's banner already covers that tab, so the existing per-tab state and question-banner rule handle it. An exhaustive check over four multi-gate pages and every combination of gate statuses (384 tab states) found at most one banner per tab and never an "unlocked" tab banner over a locked question; with the fix removed the same check fails. A planner case and a provider case for this page were added to the tests.

### Checked and not raised (focused check)

- Section identity holds: `ActivityPageContent` passes `Section` the objects from `page.sections.filter(...)`, the same ones `getVisibleSections(page)` returns to the planner, and `app.tsx` takes the page from `activity.pages` without copying it.
- A tab reached by a gating item that is still loading and one that unlocked during the visit shows "unlocked". That needs the second gate's first read, a run, and a save to finish before the first gate's first read, which a single Firestore client does not do.
- A one-section notebook page renders no tabs, and `planTabBanners` gives no tab banners for it, since nothing comes after the only section.
- The planned tests can fail: dropping the notebook check fails the "outside the notebook layout" case, including the gating item's own tab fails the `[m, q1] [text] [q2]` planner case, and the new covered-tab case fails without the fix.

