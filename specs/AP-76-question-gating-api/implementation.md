# Implementation Plan: Question Gating: Authored Setting and Unlock Message

**Jira**: https://concord-consortium.atlassian.net/browse/AP-76
**Requirements Spec**: [requirements.md](requirements.md)
**Status**: **In Development**

## Implementation Plan

Five commits. The first only bumps packages; the second reads the authored fields and texts while the demo's saved-state unlock is still in place; the third makes `IframeRuntime` report gate events, with nothing consuming them yet; the fourth swaps the saved-state unlock for those events; the fifth moves the sample and docs. Each leaves the suite green.

Node: `source ~/.nvm/nvm.sh` (no `.nvmrc`; the default is 22). Tests: `npx jest <path>`; lint: `npm run lint:build`.

### Bump the interactive API packages

**Summary**: R16. A commit of its own so the lockfile diff reviews separately.

**Files affected**:
- `package.json`, `package-lock.json`: `@concord-consortium/lara-interactive-api` `1.14.0` to `1.15.0`, `@concord-consortium/interactive-api-host` `0.13.0` to `0.14.0`.

**Estimated diff size**: ~30 lines

```bash
npm install --save-exact @concord-consortium/lara-interactive-api@1.15.0 @concord-consortium/interactive-api-host@0.14.0
```

`--save-exact` keeps the exact pins (a plain `npm install` writes `^` ranges). `npm install`, not `npm ci`. Verify: `git diff package.json` shows exactly the two version strings changed, and the `src/components/activity-page` suite (145 tests at the base) passes unchanged.

---

### Read the authored gating and banner texts

**Summary**: R1, R2, R3, R11, R13, R14 against the demo's unlock signal. The planner takes authored settings with the override on top, banners carry their text, and one rule decides what a banner shared by several gates shows, which also fixes the demo's per-question banner taking the last gate's state. Unlocking still comes from saved state until the next step.

**Files affected**:
- `src/types.ts`: the authored fields on `IMwInteractive` and `IManagedInteractive`.
- `src/utilities/disabled-questions.ts`: `toQuestionGating`, `authoredQuestionGating`, `questionGatingSettings`, `gateTexts`, `defaultLockedBannerText`, `kDefaultUnlockedBannerText`, `IBanner`, `combineBanner`.
- `src/components/activity-page/disabled-questions-context.tsx`: settings from `questionGatingSettings`, banners through `combineBanner`, live region text per gate.
- `src/components/activity-page/disabled-questions-banner.tsx`: takes an `IBanner`; the default texts move out.
- `src/components/activity-page/embeddable.tsx`, `section.tsx`: pass the banner object.
- Tests: `disabled-questions.test.ts`, `disabled-questions-context.test.tsx`, `disabled-questions-banner.test.tsx`, `activity-page-content.test.tsx`, `embeddable.test.tsx`, `section.test.tsx`.

**Estimated diff size**: ~350 lines

`src/types.ts`:

```ts
/** LARA's per-item question gating setting, exported on every MwInteractive and ManagedInteractive. */
export interface IQuestionGatingFields {
  question_gating?: string | null;
  question_gating_locked_text?: string | null;
  question_gating_unlocked_text?: string | null;
}

export interface IManagedInteractive extends EmbeddableBase, IQuestionGatingFields { ... }
export interface IMwInteractive extends EmbeddableBase, IQuestionGatingFields { ... }
```

`src/utilities/disabled-questions.ts` additions:

```ts
/** R12: names the gate when it has a name of its own. */
export const defaultLockedBannerText = (name: string | null | undefined) =>
  name?.trim() ? `Use ${name.trim()} to unlock these questions.` : "Use the interactive to unlock these questions.";
export const kDefaultUnlockedBannerText = "The questions are now unlocked!";

const kQuestionGatingValues: QuestionGating[] = ["none", "disable_following_on_page", "disable_following_in_section"];

/** A missing, null or unknown value means "none". */
export const toQuestionGating = (value: unknown): QuestionGating =>
  kQuestionGatingValues.includes(value as QuestionGating) ? value as QuestionGating : "none";

const interactives = (page: Page) => page.sections.flatMap(section => section.embeddables)
  .filter((e): e is IMwInteractive | IManagedInteractive => e.type === "MwInteractive" || e.type === "ManagedInteractive");

export const authoredQuestionGating = (page: Page): QuestionGatingSettings => Object.fromEntries(
  interactives(page)
    .map(e => [e.ref_id, toQuestionGating(e.question_gating)] as const)
    .filter(([, gating]) => gating !== "none")
);

/** The authored settings, with the override parameter's values replacing them for the items it names. */
export const questionGatingSettings = (page: Page, overrideParam: string | undefined): QuestionGatingSettings =>
  ({ ...authoredQuestionGating(page), ...parseQuestionGatingParam(overrideParam) });

export interface IGateTexts { locked: string; unlocked: string; }

const authoredText = (text: string | null | undefined, fallback: string) => text?.trim() || fallback;

export const gateTexts = (page: Page): Record<string, IGateTexts> => Object.fromEntries(interactives(page).map(e => [e.ref_id, {
  locked: authoredText(e.question_gating_locked_text, defaultLockedBannerText(e.name)),
  unlocked: authoredText(e.question_gating_unlocked_text, kDefaultUnlockedBannerText)
}]));

export interface IBanner { state: "locked" | "unlocked"; text: string; }
```

`authoredText` returns the trimmed text, so leading and trailing whitespace an author typed is dropped; LARA already saves whitespace-only text as `null`. A gate named only by the override that is not an interactive is ignored by the planner, so `gateTexts` covering interactives only is enough; `textsFor(refId)` in the provider falls back to the unnamed defaults for a missing entry.

`combineBanner` is written against the status type of this step and gains the protocol's statuses in the next:

```ts
/**
 * The banner that speaks for several gates, given in page order: locked while any is locked, with the first
 * locked gate's text; unlocked once none is locked or loading and one unlocked during the visit, with the text
 * of the gate that unlocked last; otherwise none.
 */
export const combineBanner = (
  gateRefIds: string[], statusOf: (refId: string) => GateStatus, unlockOrder: string[], textsOf: (refId: string) => IGateTexts
): IBanner | undefined => {
  const lockedGate = gateRefIds.find(refId => statusOf(refId) === "locked");
  if (lockedGate) return { state: "locked", text: textsOf(lockedGate).locked };
  if (gateRefIds.some(refId => isSettling(statusOf(refId)))) return undefined;
  const lastUnlocked = [...unlockOrder].reverse().find(refId => gateRefIds.includes(refId));
  return lastUnlocked ? { state: "unlocked", text: textsOf(lastUnlocked).unlocked } : undefined;
};
```

`isSettling` is `status === "loading"` in this step. `unlockOrder` is the ref ids in the order they reached `"unlockedDuringVisit"`; this step's provider appends to it in `report` when `nextGateStatus` makes that transition.

Provider changes in this step:

- `readQuestionGatingSettings` becomes `readQuestionGatingSettings(page)`, still catching `queryValue`'s throw: on a repeated parameter it warns and falls back to the authored settings alone (`questionGatingSettings(page, undefined)`), so a bad URL no longer hides authored gating.
- `texts = useMemo(() => gateTexts(page), [page])`.
- State becomes `{ statuses, unlockOrder }`.
- Locks: for each question, collect the gates whose first disabled question it is (and that no tab banner covers); `lock.banner = combineBanner(thoseGates, ...)`. Tabs: `combineBanner(gatesReachingTab, ...)`. Both lists are in plan order, which is page order (`planDisabledQuestions` walks items in order).
- Live region: `const announced = unlockOrder.filter(refId => (plan[refId]?.length ?? 0) > 0)`; render `<span key={announced.length}>{textsOf(last(announced)).unlocked}</span>` when non-empty.
- `IQuestionLock.banner` and `useTabBanner` return `IBanner | undefined`; `BannerState` is deleted.

`DisabledQuestionsBanner` props become `{ banner: IBanner; tab?: boolean }`, rendering `banner.text` and choosing the icon and class from `banner.state`. `embeddable.tsx` and `section.tsx` (both tab-banner sites) pass `banner={...}`.

Tests (each names the mutation it catches):

- `toQuestionGating`: each valid value maps to itself (including `"none"`, the sentinel), and `undefined`, `null`, `""`, `"disable_everything"` and `42` map to `"none"`. Catches dropping the validity check.
- `questionGatingSettings`: authored values on a `MwInteractive` and a `ManagedInteractive` are read; `"none"`, `null` and an unknown value are left out; an override entry adds a gate and replaces an authored value (authored `"disable_following_in_section"` named without `:section` reads `"disable_following_on_page"`), while an unnamed authored gate survives. Catches reversing the spread order.
- `gateTexts`: authored text is used, trimmed; `null`, missing, `""` and `"   "` fall back to each default; the two states fall back independently; the locked default names a gate called "Wildfire Explorer" and uses the generic text for a gate whose `name` is `""`, `"  "` or missing (a `ManagedInteractive` case gives its library interactive `data.name: "Multiple Choice"` and an empty item `name`, and expects the generic text, catching a read of the library interactive's name; the default fixtures leave both names empty).
- `combineBanner`, with gates `a` and `b` whose texts all differ: both locked gives `a`'s locked text; `a` unlocked and `b` locked gives `b`'s locked text; one loading gives none; both unlocked during the visit in order `b`, `a` gives `a`'s unlocked text (so it is not "first in page order"); both unlocked on load gives none (`"open"` once the next steps rename the status).
- Provider, side-by-side gates sharing a first question (a 60-40 section `A`, `Q1` | `B`, `Q2`): `B` unlocking while `A` stays locked keeps `Q1`'s banner locked with `A`'s text. Fails on the demo's last-gate-wins rule.
- Provider, per-question and tab banners carry authored text, default text when empty, and the live region announces the unlocking gate's text (two gates with different unlocked texts, unlocked in turn, announce each in turn).
- Provider, a page with authored gating and no URL parameter locks; with `?override:disableQuestionsAfter=a,a` it warns and still applies the authored gate.
- Banner component tests move to the `banner` prop and assert the text it is given.

---

### Report gate events from the interactive

**Summary**: R7a, R15 and the runtime half of R6 to R9. `IframeRuntime` turns its interactive's messages and iframe events into gate events through a small reporter object and advertises `hostFeatures.questionGating`. Nothing passes `onQuestionGateEvent` yet, so the page behaves as before apart from the advertised feature; a commit of its own so the runtime wiring reviews apart from the provider rewrite.

**Files affected**:
- `src/utilities/disabled-questions.ts`: `GateEvent`.
- `src/components/activity-page/managed-interactive/question-gate-reporter.ts` (new) and its test.
- `src/components/activity-page/managed-interactive/iframe-runtime.tsx`: `onQuestionGateEvent` prop, the reporter, the `unlockQuestions` listener, the iframe `onLoad`, `hostFeatures.questionGating`.
- `src/components/activity-page/managed-interactive/managed-interactive.tsx`: passes `onQuestionGateEvent` through `iframeRuntimeProps` (inline and dialog runtimes); reports a failed saved-state read.
- `src/firebase-db.ts`: `getLegacyLinkedInteractiveInfo` gains an optional `onError`, called when its answer read rejects.
- Tests: `question-gate-reporter.test.ts`, `iframe-runtime.test.tsx`, `managed-interactive.test.tsx`, `firebase-db.test.ts`.

**Estimated diff size**: ~340 lines

`GateEvent`, added beside the demo's `GateStatus`:

```ts
export type GateEvent =
  | { type: "declared"; hasState: boolean }
  | { type: "restoreWindowEnded" }
  | { type: "declarationWindowEnded" }
  | { type: "unlocked"; restored: boolean };
```

`question-gate-reporter.ts`:

```ts
import { ISupportedFeatures, IUnlockQuestionsMessage } from "@concord-consortium/lara-interactive-api";
import { GateEvent } from "../../../utilities/disabled-questions";

export const kDeclarationWindowMs = 5000;
export const kRestoreWindowMs = 1000;

/** Turns one interactive's messages and iframe events into the events its gate's status is built from. */
export class QuestionGateReporter {
  private declared = false;
  private declarationTimer: number | undefined;
  private restoreTimer: number | undefined;

  constructor(private report: (event: GateEvent) => void) {}

  /** The iframe loaded or the host sent initInteractive: the interactive gets a full window to declare. */
  restartDeclarationWindow() {
    if (this.declared) return;
    window.clearTimeout(this.declarationTimer);
    this.declarationTimer = window.setTimeout(() => this.report({ type: "declarationWindowEnded" }), kDeclarationWindowMs);
  }

  supportedFeatures(features: ISupportedFeatures, hasState: boolean) {
    if (!features.questionGating || this.declared) return;
    this.declared = true;
    window.clearTimeout(this.declarationTimer);
    this.report({ type: "declared", hasState });
    if (hasState) {
      this.restoreTimer = window.setTimeout(() => this.report({ type: "restoreWindowEnded" }), kRestoreWindowMs);
    }
  }

  unlock(options: IUnlockQuestionsMessage | undefined) {
    this.report({ type: "unlocked", restored: !!options?.restored });
  }

  dispose() {
    window.clearTimeout(this.declarationTimer);
    window.clearTimeout(this.restoreTimer);
  }
}
```

A `supportedFeatures` message without `questionGating` settles nothing, since an interactive may post several (the multiple-choice interactive posts two). Disposing on unmount is what gives R10's "a gate collapsed away while loading stays loading": the timers stop with the runtime, and a remounted runtime starts over, while the provider's status, which outlives it, ignores events that no longer apply.

`iframe-runtime.tsx`:

```ts
interface IProps {
  ...
  /** Set for a gating item: receives its gate events. */
  onQuestionGateEvent?: (event: GateEvent) => void;
}

const onQuestionGateEventRef = useRef(onQuestionGateEvent);
onQuestionGateEventRef.current = onQuestionGateEvent;
const [gateReporter] = useState(() =>
  onQuestionGateEvent && new QuestionGateReporter(event => onQuestionGateEventRef.current?.(event)));
useEffect(() => () => gateReporter?.dispose(), [gateReporter]);
const handleIframeLoad = () => gateReporter?.restartDeclarationWindow();
```

- `supportedFeatures` listener, after the `focusProtocol` line: `gateReporter?.supportedFeatures(features, currentInteractiveState.current != null);` (`!= null` covers both `null` and absent, R6).
- New listener after `navigation`: `addListener("unlockQuestions", (options: IUnlockQuestionsMessage) => gateReporter?.unlock(options));`
- `postInitInteractive`, after `phone.post("initInteractive", ...)`: `gateReporter?.restartDeclarationWindow();`
- `<iframe ... onLoad={handleIframeLoad}>`.
- `baseProps.hostFeatures` gains `questionGating: { version: "1.0.0" }` after `getFirebaseJwt`.

The reporter is created once per mounted runtime, and only when the runtime mounts with a callback; a gate's callback is present from its first render, because the plan is computed synchronously from the page. The existing `exhaustive-deps` disable on the main effect is unchanged; `gateReporter` is stable and read inside it.

`managed-interactive.tsx`: `IProps` gains `onQuestionGateEvent?`, added to `iframeRuntimeProps`, so the dialog runtime reports too (R9).

R7a: `ManagedInteractive` renders "Loading..." until its answer and any legacy linked state arrive, so when either read fails its runtime never mounts, no iframe `load` starts the window, and a gate would stay loading for the visit. Both reads get an error handler:

```ts
const onStateUnavailable = (error: Error) => {
  console.warn(`Could not load the saved state of ${embeddableRefId}: ${error.message}`);
  // A gate whose interactive cannot run can never declare, so it opens.
  onQuestionGateEventRef.current?.({ type: "declarationWindowEnded" });
};
return watchAnswer(embeddableRefId, wrappedAnswer => { ... }, onStateUnavailable);
...
return getLegacyLinkedInteractiveInfo(embeddableRefId, laraData, info => { ... }, onStateUnavailable);
```

`onQuestionGateEventRef` mirrors the prop, as `IframeRuntime` does, so the two effects keep their current dependencies. The item itself stays on "Loading...", as it does today. For a non-gate item the only change is that a listener error is logged rather than thrown uncaught from Firestore's callback. `getLegacyLinkedInteractiveInfo` adds `.catch(error => onError?.(error))` after its `.then`.

Tests:

- `QuestionGateReporter` with fake timers: reports `declarationWindowEnded` 5000 ms after `restartDeclarationWindow` and not at 4999; a second restart at 3000 ms moves the end to 8000; a declaration cancels it; a window that ends before a late restart (6000 ms) has already reported, and the restart reports again at 11000 (R7's fail-open case, pinned so a reader sees it is intended); `supportedFeatures({ aspectRatio: 1 })` reports nothing; a declaration with state reports `restoreWindowEnded` after 1000 ms, without state reports none; a second declaration reports nothing; `dispose` cancels both timers.
- `iframe-runtime.test.tsx`: the `renders component` expectation of `hostFeatures` gains `questionGating: { version: "1.0.0" }` (catches dropping R15); with `onQuestionGateEvent`, dispatching `supportedFeatures { questionGating: true }` reports `declared` with `hasState: true` for the harness's `{ testing: true }` state and `false` after Clear & start over; `unlockQuestions { restored: true }` reports `unlocked` restored; `fireEvent.load` on the iframe starts the window; without the prop, dispatching both messages reports nothing and throws nothing.
- `managed-interactive.test.tsx`: `onQuestionGateEvent` reaches the inline runtime and, with a dialog open, the dialog runtime; a `watchAnswer` error, and separately a rejected legacy linked read, report `declarationWindowEnded` once and leave "Loading..." in place (the file's `watchAnswer` mock forwards `onError` so the test can fire it). Each fails with its handler removed.
- `firebase-db.test.ts`: `getLegacyLinkedInteractiveInfo` calls `onError` when the answer read rejects, and not the callback.

---

### Settle gates from the interactive's messages

**Summary**: R4 to R10. Gates settle from the events the previous commit reports, through a pure transition function, instead of saved state. The provider's answer watch and everything only it used go away.

**Files affected**:
- `src/utilities/disabled-questions.ts`: `GateStatus` gains `"awaitingRestore"` and renames `"unlockedOnLoad"` to `"open"`; `nextGateStatus(status, event)` replaces `nextGateStatus(status, hasSavedState)`; `applyGateEvent`.
- `src/components/activity-page/embeddable.tsx`: `useQuestionGateReporter(embeddable.ref_id)`.
- `src/components/activity-page/disabled-questions-context.tsx`: drops `watchAnswer`; `getGateReporter`; warns when a gate's window ends undeclared.
- `src/test-utils/answer-watchers.ts`: drops `subscriberCount` and `kSavedAnswer`, whose only users were the provider's watch tests and the page tests' saved-state unlock (checked by grep at the base); `fail` and the error handlers stay for a page test of R7a; `firebaseDbMock` gains `getConfiguration`.
- `src/test-utils/iframe-phones.ts` (new): an iframe-phone mock keyed by iframe id.
- Tests: `disabled-questions.test.ts`, `embeddable.test.tsx`, `disabled-questions-context.test.tsx`, `activity-page-content.test.tsx`, `single-page-content.test.tsx`.

**Estimated diff size**: ~550 lines, most of it the rewritten provider and page tests.

Transition function:

```ts
/** "loading" and "awaitingRestore" both show as disabled but not grayed, with no banner. */
export type GateStatus = "loading" | "awaitingRestore" | "locked" | "unlockedDuringVisit" | "open";

export const isSettling = (status: GateStatus) => status === "loading" || status === "awaitingRestore";

/** Unlocking is one way within a visit, and a gate never returns to loading. */
export const nextGateStatus = (status: GateStatus, event: GateEvent): GateStatus => {
  if (status === "open" || status === "unlockedDuringVisit") return status;
  switch (event.type) {
    case "declared":
      return status === "loading" ? (event.hasState ? "awaitingRestore" : "locked") : status;
    case "restoreWindowEnded":
      return status === "awaitingRestore" ? "locked" : status;
    case "declarationWindowEnded":
      return status === "loading" ? "open" : status;
    case "unlocked":
      // The unlocked banner announces a change the student saw, so only a locked gate shows it.
      return status === "locked" && !event.restored ? "unlockedDuringVisit" : "open";
  }
};

export interface IGateState { statuses: Record<string, GateStatus>; unlockOrder: string[]; }

export const applyGateEvent = (state: IGateState, refId: string, event: GateEvent): IGateState => {
  const status = state.statuses[refId] ?? "loading";
  const next = nextGateStatus(status, event);
  if (next === status) return state;
  return {
    statuses: { ...state.statuses, [refId]: next },
    unlockOrder: next === "unlockedDuringVisit" ? [...state.unlockOrder, refId] : state.unlockOrder
  };
};
```

Returning the same object when nothing changes lets React skip the re-render on repeated messages. The demo's `report` in the provider is replaced by `applyGateEvent`, which now owns `unlockOrder`.


`embeddable.tsx`: `const reportGateEvent = useQuestionGateReporter(embeddable.ref_id);` passed as `onQuestionGateEvent={reportGateEvent}` to `ManagedInteractive`.

Provider:

```ts
const [gates, setGates] = useState<IGateState>({ statuses: {}, unlockOrder: [] });

const reporters = useMemo(() => Object.fromEntries(gatingKey.split(",").filter(Boolean).map(refId => [refId,
  (event: GateEvent) => {
    if (event.type === "declarationWindowEnded") warnUndeclaredOnce(refId);
    setGates(prev => applyGateEvent(prev, refId, event));
  }
])), [gatingKey]);
```

The provider is remounted for every page (`app.tsx` keys `ActivityPageContent` by page, `single-page-content.tsx` keys each provider) and Teacher Edition and portal data are fixed at load, so a provider's gates never change; the statuses need no key or reset. Statuses of items outside the plan are never read.

`warnUndeclaredOnce` logs `console.warn` once per gate, naming its `ref_id` and `name` and saying it never declared question-gating support, so an author previewing a gate that cannot declare sees why nothing locks. It warns on the event rather than the transition, because a gate already settled by a later declaration never receives one (the reporter cancels the window).

The context gains `getGateReporter: (refId) => reporters[refId]`, with `undefined` for any item that is not a gate on this page (R9), and `useQuestionGateReporter(refId)` reads it. The reporters live in their own memo so their identities do not change when statuses do. The watch effect, `bannerFor` and the saved-state imports are deleted.

Test harness: `src/test-utils/iframe-phones.ts` exports `iframePhones` (per-iframe-id `post` calls and listeners, `dispatch(refId, type, data)`, `reset()`) and a `parentEndpointMock` for `jest.mock("iframe-phone", () => jest.requireActual("../../test-utils/iframe-phones").iframePhoneMock)`. The mock calls the connect callback in a `setTimeout`, as `iframe-runtime.test.tsx`'s own mock does. Page-level tests need an `http` interactive URL (the default test library interactive has `base_url: ""`, which renders `about:blank` and opens no phone) and `getConfiguration` in `firebaseDbMock`.

Tests:

- `nextGateStatus`, table-driven over every status and event, including: `declared` without state locks, with state awaits; `restoreWindowEnded` locks only an awaiting gate; `declarationWindowEnded` opens only a loading gate (an awaiting or locked gate stays); `unlocked` restored opens from any unsettled or locked status; `unlocked` not restored turns locked into unlocked-during-visit and loading or awaiting into open; nothing leaves open or unlocked-during-visit.
- `applyGateEvent` returns the same object for a no-op, and appends to `unlockOrder` only on the transition to unlocked-during-visit (a second unlock does not append twice).
- `embeddable.test.tsx`: the mocked context's reporter for the item's ref id is the prop `ManagedInteractive` receives.
- Provider tests move from `answerWatchers.report` to calling the reporter from a probe (`useQuestionGateReporter`), covering R5 to R8 and R10: a gate that declares without state locks; with state, stays loading, then opens on a restored unlock with no banner and no announcement, or locks when the 1 s window ends; a gate that never declares opens when its window ends; an undeclared gate's questions are never grayed; Teacher Edition and a locked offering give no reporter. A gate whose window ends undeclared warns once, naming its `ref_id`, however many window ends its runtimes report.
- `activity-page-content.test.tsx`, `single-page-content.test.tsx`: rewritten on the iframe-phone harness: authored gating in the page JSON, dispatch `supportedFeatures` from the gate's phone, see the locked banner and an inert question; dispatch `unlockQuestions`, see the unlocked banner, the announcement and a usable question. A second case fires the gate iframe's `load` event without declaring, advances fake timers 5000 ms, and sees the question usable with no banner, so the window is covered end to end and not only in the reporter's unit test. Fails if any link (provider, `Embeddable`, `ManagedInteractive`, `IframeRuntime`) is missing. A third case fails the gate's answer watch with `answerWatchers.fail` and sees its question usable with no banner (R7a end to end). The single-page test keeps its "ends with the authored page" assertion.

---

### Move the sample activity and docs to the real API

**Summary**: R17, R18.

**Files affected**:
- `src/data/version-2/sample-new-sections-disabled-questions.json`
- `src/utilities/disabled-questions.test.ts` (the sample's plan test)
- `README.md`

**Estimated diff size**: ~60 lines

- Sample JSON: `question_gating: "disable_following_on_page"` on `9101` to `9105`, `"disable_following_in_section"` on `9116`; every Wildfire URL becomes `https://models-resources.concord.org/wildfire-model/branch/master/index.html?hazbotRules=23` (the same build as `wildfire.concord.org/branch/master`, both carrying WM-66); `9101` carries authored locked and unlocked texts naming Hazbot. Text box `9121` and the activity description describe the rule (run the model, then click Hazbot Analysis) and say the gating is authored; the description stops telling readers to add the override.
- Plan test: `planPage` uses `authoredQuestionGating(page)` instead of the hand-written `allModels` map, so it fails if the JSON loses a field; expectations are unchanged.
- README line 208: `override:disableQuestionsAfter` "sets `question_gating` on each named interactive, over its authored value: `disable_following_on_page`, or `disable_following_in_section` with `:section`. Questions lock only if that interactive declares question-gating support (Wildfire does with `hazbotRules` in its URL), and unlock when it sends `unlockQuestions`." Keep the other-column, single-page, Teacher Edition and locked-offering sentences; drop the saved-state clause and the "built for it" sentence about the sample, which no longer needs the parameter.
- Grep for the saved-state stand-in in comments and docs: `rg -n "saved state|saves state|first run|disableQuestionsAfter" src README.md`, and update what describes the old unlock.

Real-app check (Playwright, dev server on 8081), recorded in the PR: local activity 41 page 1 locks with "AUTHORED LOCKED TEXT (page)", unlocks with the authored unlocked text after a run and a Hazbot click, and on a return visit (same `runKey`) loads with no banner and never shows the locked state; page 2 (no `hazbotRules`) shows its question disabled and ungrayed for about 5 s after the model loads, then open with no banner; the sample's five pages lock and unlock in preview.

## Open Questions

### RESOLVED: Judgment call: where do the windows' timers live?
**Options considered**:
- A) In a reporter object owned by each gate's `IframeRuntime`, which reports window-ended events.
- B) In the provider, fed raw `load`, `initInteractive` and declaration events.

**Decision**: A. The windows are measured from that runtime's own iframe and `initInteractive`, and dispose with it, which gives R10 for free; the provider stays a pure fold over events. B would need the provider to track runtime mounts to know when to stop a timer.

### RESOLVED: Judgment call: pass the reporter down as props or read the context in `IframeRuntime`?
**Options considered**:
- A) `Embeddable` reads the context and passes `onQuestionGateEvent` down, like `setNavigation`.
- B) `IframeRuntime` calls the context hook itself.

**Decision**: A. It follows the `navigation` precedent the requirements point at, keeps `IframeRuntime` testable without a provider, and reaches the dialog runtime through the shared `iframeRuntimeProps`.

### RESOLVED: Judgment call: what happens to the provider's state when the gates change?
**Options considered**:
- A) Key the state by `gatingKey` and treat a mismatched key as empty.
- B) Keep the demo's reset effect.
- C) Plain state with no key and no reset.

**Decision**: C. A provider is remounted for every page and its gates are fixed at load, so the gates never change under it. A or B would also strand a gate if they did: resetting a gate to loading while its mounted runtime's reporter has already latched its declaration leaves it loading for good.

### RESOLVED: Low confidence: the click-to-play gate
The plan implements R5 to R7 as written, so a click-to-play gate stays loading until played and needs no input from `ManagedInteractive`.

**Decision**: Follows the requirements decision (B, Doug Martin, 2026-10-08); no extra event or prop.

## Self-Review

Roles: commit reviewer, test writer, senior engineer, operator. Each claim below was checked by building the proposed code as throwaway code (the transition function, `QuestionGateReporter`, and the `IframeRuntime` wiring patched into the real file), then deleted.

- **Step independence (commit reviewer).** The protocol types do not exist at 1.14.0: code using them fails to compile until the bump is installed, which confirms the bump must be the first commit. With it, the throwaway tests passed, `eslint -c .eslintrc.build.js` was clean on the patched `iframe-runtime.tsx`, and the existing 20 `iframe-runtime.test.tsx` tests passed with the wiring in place. The authored-fields step uses only Activity Player types, so it builds on either package version.
- **Exact pins (operator).** `npm install --save-exact` produced `"0.14.0"` and `"1.15.0"` with no other `package.json` change.
- **Harness (test writer).** In `iframe-runtime.test.tsx`'s existing harness, a throwaway case saw `declared` with `hasState: true`, `restoreWindowEnded` 1000 ms later, then a restored `unlocked`; without `onQuestionGateEvent` the same messages reported nothing and threw nothing; `fireEvent.load` followed by 5000 ms reported `declarationWindowEnded`. Page-level tests needed an `http` interactive URL and `getConfiguration` in the Firestore mock.
- **Orphans (senior engineer).** Fixed in place: the settle step deletes `kSavedAnswer` and `subscriberCount` with the provider's watch. `watchAnswer`'s `onError` and `answerWatchers.fail` stay, now used by `ManagedInteractive` for R7a and its page test.
- **End-to-end coverage (test writer).** Fixed in place: the page-level test also covers the declaration window through the real `IframeRuntime`, so a broken `onLoad` wiring fails a page test, not only a unit test.
- **Docs (operator).** Only `README.md` describes the feature outside `specs/`; the sample step's grep covers code comments.

## Self-Review: second round

Roles: Senior Engineer, Commit Reviewer, QA Engineer, Student, Education Material Developer (author), next-engineer reader. Each finding was checked against the code at `af9de86f`; the R7 finding was also reproduced with a throwaway jest test of this plan's `nextGateStatus` and `QuestionGateReporter`, then deleted. The `src/components/activity-page` baseline of 145 tests was re-measured and holds.

### Senior Engineer

#### RESOLVED: A gate whose runtime never mounts keeps its questions disabled for good
`ManagedInteractive` renders "Loading..." until its `watchAnswer` callback fires (`managed-interactive.tsx:122-129`), and it passes no `onError`, so on a Firestore listener error the gate's `IframeRuntime` never mounts: no iframe `load`, no window, and the gate stays loading, its questions inert with no banner, for the rest of the visit. The demo fixed exactly this case (`a1770fee`: "A gate whose Firestore listener fails shows as locked with its banner instead of staying in the unexplained loading state") through the provider's own watch, which this plan deletes along with `watchAnswer`'s `onError`. The requirements never say what happens, and the Project Owner Overview's "Nothing can lock students out by mistake" does not hold for it.
**Options considered**:
- A) `ManagedInteractive` passes `onError` to its `watchAnswer` and, for a gate, reports `declarationWindowEnded`, so the gate opens (its interactive cannot run, so it can never declare). Add a requirement line under R7. `watchAnswer`'s `onError` and `answerWatchers.fail` stay; only the provider's use of them goes.
- B) A provider-level backstop that opens any gate still loading some time after render. Catches every never-mounts cause, but contradicts the click-to-play decision (loading until played).
- C) Accept it and list it in Out of Scope.

Suggested: A.

**Decision**: A (Doug Martin, 2026-10-08), R7a. The legacy linked-state read hangs the same way (`.then` with no `.catch`), so it gets the same handler.

#### RESOLVED: R7's "connects late" promise does not hold past the window
R7 says the window restarts on each `initInteractive`, "so an interactive that connects late, or whose `initInteractive` waits on a token, still gets the full window after it is initialized." The window starts at iframe `load`, so if `hello` arrives, or the token resolves, more than 5 s after `load`, the gate has already opened and the later declaration is ignored. A throwaway test of the plan's code (load at 0, `initInteractive` at 6000 ms, then `questionGating: true`) ends `open`. Failing open is the safe direction, so the behavior is defensible; the requirement text is what is wrong.
**Options considered**:
- A) Reword R7 to what the design does: the window runs from `load` and each `initInteractive` restarts it, so a connection or token wait that finishes inside the window extends it, and one that finishes after it fails open. Add the 6000 ms case to the reporter tests to pin it.
- B) Pause the window from `hello` until `initInteractive` is posted, so a token wait never consumes it; a token that never resolves then leaves the gate loading.

Suggested: A.

**Decision**: A, applied without a user decision: R7 now says a connection or token wait that finishes after the window leaves the gate open, and the reporter tests pin the 6000 ms case.

#### RESOLVED: Keying the provider's state by `gatingKey` guards a case that cannot happen, and would strand a gate if it did
The provider is remounted for every page (`app.tsx:705` keys `ActivityPageContent` by page; `single-page-content.tsx:29` keys each provider), and `teacherEditionMode` and portal data are set once at load, so `gatingKey` is fixed for a provider's life; the code comment "(another page)" describes something that does not occur. If the key did change and come back (`a` → `""` → `a`), the keyed state would reset `a` to loading while its still-mounted runtime's reporter has latched `declared` and ignores both later declarations and `restartDeclarationWindow`, leaving the gate loading for good.
**Options considered**:
- A) Plain `useState<IGateState>` with no key, no `emptyGates`, and reporters memoized on `gatingKey` as now. Statuses for gates no longer in the plan are simply never read. Flip the judgment call's decision.
- B) Keep the keyed state and correct the comment.

Suggested: A, which deletes code and removes the stranding path.

**Decision**: A, applied without a user decision: the provider holds plain `IGateState`, and the judgment call above records it as C.

---

### Commit Reviewer

#### RESOLVED: The protocol step is well over the ~500-line budget
The ~480-line estimate does not fit its contents: a new reporter and its test, a new iframe-phone harness, the table-driven transition tests, `IframeRuntime`, `ManagedInteractive` and `Embeddable` wiring and tests, and rewrites of the provider tests (239 lines today, nearly all on the saved-state watch) and the page tests (`activity-page-content.test.tsx`'s gating block and `single-page-content.test.tsx`), plus the deletions. 700 to 900 changed lines is the likelier size.
**Options considered**:
- A) Split it. "Report gate events from the interactive": `GateStatus`/`GateEvent`/`nextGateStatus`/`applyGateEvent` (alongside the old function until the next commit, or with the old one renamed), `QuestionGateReporter`, the `IframeRuntime` and `ManagedInteractive` wiring, `hostFeatures.questionGating`, and their unit tests; no provider change, suite green. "Settle gates from the interactive's messages": provider, `Embeddable`, the harness, page tests and the deletions.
- B) Keep one commit and raise the estimate.

Suggested: A.

**Decision**: A, applied without a user decision: "Report gate events from the interactive" (~300 lines) and "Settle gates from the interactive's messages" (~550, mostly rewritten tests). Only `GateEvent` moves to the first, so the demo's `GateStatus` and `nextGateStatus` stay untouched until the second.

---

### QA Engineer

#### RESOLVED: A step-2 test case names a status that only exists in step 3
The `combineBanner` tests in "Read the authored gating and banner texts" end with "both open gives none", but at that step the status is `"unlockedOnLoad"`; `"open"` arrives in the protocol step. As written the step-2 test does not compile against step 2's `GateStatus`.
**Suggested**: say "both unlocked on load gives none" in step 2, and note that the protocol step renames it with the status.

**Decision**: Applied without a user decision.

---

### Education Material Developer (author)

#### RESOLVED: A gate that never declares gives the author no sign of why nothing locks
An author who gates an interactive that cannot declare (Wildfire without `hazbotRules`, or another interactive) previews the page, sees the questions inert for a few seconds and then usable, and has nothing pointing at the cause. The requirements make this fail open on purpose, which is right for students, but nothing in the plan logs it.
**Suggested**: when a gate's declaration window ends, `console.warn` naming the item (`ref_id` and name) and saying it never declared question-gating support. One line in the provider where `declarationWindowEnded` turns a gate open, plus a test that it warns once.

**Decision**: Applied without a user decision: the provider warns once per gate on `declarationWindowEnded`.

---

### Next-engineer reader

#### RESOLVED: Several notes point at a process the reader cannot see
"checked in stage 4", "checked in stage 3", "confirmed with a throwaway page test in stage 5", "the stage 1 reproduction", "the prototype" and "the integration prototype" refer to the speccing session, not to anything in the repo. A reader cannot follow them.
**Suggested**: state the fact and drop the provenance: "(a plain `npm install` writes `^` ranges)", "(both carry WM-66)", "a 60-40 section `A`, `Q1` | `B`, `Q2`", "a flat 15 s timeout from page render", "`IframeRuntime` reads the context itself".

**Decision**: Applied without a user decision, in both files.
