# AP-110: Focus Trap for the Dialog Overlay (non-cooperating)

**Jira**: https://concord-consortium.atlassian.net/browse/AP-110

**Parent design**: [AP-108-focus-traps-cross-origin-interactives.md](AP-108-focus-traps-cross-origin-interactives.md) — AP-110 is the first piece of AP-108 work to land in Activity Player.

**Scope**: Activity Player only. Integrate `@concord-consortium/accessibility-tools@0.2.0-pre.2` and apply it to the **dialog** modal that an interactive opens via `showModal({ type: "dialog" })`. Non-cooperating only — the interactive does not yet speak the focus-coordination protocol. The image-question interactive is the verification target.

## Goal

A keyboard user inside the dialog can:

- Always reach a host-rendered close button (the keyboard escape hatch the parent spec requires for non-cooperating dialogs).
- Tab forward from the close button into the iframe (native descent into the iframe's first focusable).
- Tab back out of the iframe in either direction without escaping the modal — focus wraps inside the dialog.
- See a visible "Press Tab to enter…" hint when the trap programmatically cycles into the iframe-slot (wrap from the close button) instead of resting silently on an invisible sentinel.

What still doesn't work in AP-110 (deferred to follow-up AP-108 work):

- Escape pressed **inside** the iframe does not close the dialog (the parent cannot observe it without the cooperating protocol). The user dismisses via the close button, the interactive's own in-iframe controls (e.g. the image question's Cancel/Done buttons, which post `closeModal`), or mouse on the close button / scrim.
- Precise focus restoration into the originating iframe element on close (a coarse `iframe.focus()` fallback is used).
- `notCloseable` dialogs remain a keyboard hard-lock when the inner iframe doesn't dismiss itself — this is the current behavior, not a regression.

## Non-goals (deferred)

- Lightbox modal (separate focus profile — plain `<iframe>` or `<img>`, not an interactive).
- Alert modal (still unsupported in AP; falls back to `window.alert`).
- Cooperating protocol — no `lara-interactive-api` `focusProtocol` capability, no `focusEnter`/`focusExit` messages, no `interactive-api-host` `FocusManager`.
- Content-only LARA flag and iframe `tabIndex=-1` policy beyond the existing `locked` case.
- Proper focus restoration via iframe-slot + `requestRestore()` for all page-level iframes.
- Focus ring around the iframe when focus is inside.
- `AccessibilityProvider` debug wiring.
- `notCloseable` hard-lock fix (still a pre-existing limitation).

## Approach (chosen)

**New `DialogOverlay` component** at `src/components/activity-page/managed-interactive/dialog-overlay.tsx`. It owns the focus trap, the modal chrome (header bar + close button), the sentinel refs, and the `<Modal>` wrapper. `managed-interactive.tsx` replaces its current inline `<Modal>{interactiveIframeRuntime}</Modal>` with `<DialogOverlay …>`. `iframe-runtime.tsx` gains optional ref props and renders sentinel `<span>`s around the iframe **unconditionally** — inert when refs aren't wired up (default `tabindex=-1`, zero-size, no listeners).

Rejected alternatives:

- **Inline the trap into `managed-interactive.tsx`** — that file is already ~440 lines and mixes inline-page and dialog concerns. Adding strategy, refs, close-button rendering compounds that.
- **Have `iframe-runtime` itself call `useIframeSlot`** — inverts ownership: the trap-owning component needs the strategy fragment, not `iframe-runtime`. Also introduces a build-order cycle (the slot's `onExit` calls the trap's `cycleToAdjacentSlot`).

## Components

### 1. `iframe-runtime.tsx` — render sentinels, accept refs

`iframe-runtime` always renders `[before-sentinel][iframe][after-sentinel]` inside its existing `<div className="iframe-runtime">` wrapper. The wrapper gains `position: relative` so absolute-positioned sentinels are anchored there.

New optional props on `IframeRuntime`:

```ts
iframeRef?: React.MutableRefObject<HTMLIFrameElement | null>;
beforeSentinelRef?: React.MutableRefObject<HTMLElement | null>;
afterSentinelRef?: React.MutableRefObject<HTMLElement | null>;
```

Each is forwarded to the corresponding rendered element via a small `composeRefs` helper that updates both the existing internal ref (used by `iframe-runtime` for `phoneRef`, `setSupportedFeatures`, etc.) and the external ref. When a prop is omitted (the inline page case), the sentinels still render but are inert — no event listeners attach to them and the library never writes their attributes.

The `IframeRuntimeImperativeAPI` also gains `getIframeElement(): HTMLIFrameElement | null`, used by `managed-interactive` for the temporary focus-restoration fallback on close.

**React stability**: per the library's contract, the host must not also write `tabIndex`, `data-show-hint`, or `aria-label` on the sentinels. The library is the single imperative writer. The sentinel JSX has a stable key, an unconditional render, and only `className` + `tabIndex={-1}` at the source-level (the library overwrites `tabindex` imperatively when active).

#### Sentinel DOM and styling

```tsx
<span
  ref={composeRefs(internalBeforeRef, props.beforeSentinelRef)}
  className="iframe-slot-sentinel"
  tabIndex={-1}
>
  <span className="iframe-slot-sentinel-label">Press Tab to enter the interactive</span>
</span>
<iframe ref={composeRefs(internalIframeRef, props.iframeRef)} … />
<span
  ref={composeRefs(internalAfterRef, props.afterSentinelRef)}
  className="iframe-slot-sentinel"
  tabIndex={-1}
>
  <span className="iframe-slot-sentinel-label">Press Tab to enter the interactive</span>
</span>
```

The label `<span>` is rendered statically; CSS shows it only when the library sets `[data-show-hint]` on the sentinel.

`iframe-runtime.scss`:

```scss
.iframe-runtime {
  position: relative;   // anchor for the absolute-positioned sentinels
  // existing styles…
}

.iframe-slot-sentinel {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  outline: none;
  pointer-events: none;

  .iframe-slot-sentinel-label { display: none; }

  &[data-show-hint] {
    width: auto;
    height: auto;
    overflow: visible;
    clip: auto;
    padding: 8px 12px;
    background: white;
    border: 2px solid $cc-orange;   // visible keyboard-rest indicator
    z-index: 1;
    pointer-events: auto;

    .iframe-slot-sentinel-label { display: inline; }
  }
}
```

Both sentinels anchor at the iframe's top-left; only one is ever in `[data-show-hint]` at a time, so they don't conflict. The hint **overlays** the iframe's top-left corner — no page reflow when toggling between rest and landing. Brief occlusion of the iframe's top-left content during landing is accepted; the user's next Tab descends and the hint collapses back to zero size.

Token (`$cc-orange`) and exact colors are placeholders to settle during implementation.

### 2. New `DialogOverlay` component

Path: `src/components/activity-page/managed-interactive/dialog-overlay.tsx`.

Owns:

- The `<Modal>` (react-modal) — provides portal, scrim, lifecycle. Focus management disabled (see below).
- Header bar with a Close `<button>` (omitted when `notCloseable`). The `title` prop is not rendered visibly; it supplies the modal's accessible name (see `contentLabel` below).
- Refs: `containerRef` (modal content div, the trap container), `closeButtonRef`, `iframeRef`, `beforeSentinelRef`, `afterSentinelRef`, `iframeWrapperRef`.
- A wrapper `<div ref={iframeWrapperRef}>` around the rendered `<IframeRuntime>` — the strategy's `content` slot element, used by the library's `setChildrenNonTabbable` exclusion (the wrapper and all descendants — sentinels + iframe — are skipped).
- The `useIframeSlot` call (returns `strategyFragment` and the sentinel refs/keys).
- The `useFocusTrap` call with a strategy merging the close-button slot + the iframe-slot fragment.
- An `enterTrap()` call from the container ref callback (on first attach) to auto-engage — see Engagement below.

Inputs (props):

```ts
interface DialogOverlayProps {
  url: string;
  title?: string;
  notCloseable?: boolean;
  onClose: () => void;
  // The full set of props that `<IframeRuntime>` needs — passed through:
  iframeRuntimeProps: Omit<IframeRuntimeProps, "iframeRef" | "beforeSentinelRef" | "afterSentinelRef">;
  iframeRuntimeRef?: React.Ref<IframeRuntimeImperativeAPI>;
}
```

`managed-interactive.tsx` constructs the same `iframeRuntimeProps` it does today (including the dialog URL it currently overrides) and hands them to `DialogOverlay`, which renders `<IframeRuntime>` itself.

Strategy:

```ts
const strategy: FocusTrapStrategy = {
  cycleOrder: notCloseable ? ["content"] : ["close", "content"],
  contentSlot: "content",
  nativeTabSlots: ["content"],
  getElements: () => ({
    close: notCloseable ? undefined : closeButtonRef.current ?? undefined,
    content: iframeWrapperRef.current ?? undefined,
  }),
  ...strategyFragment,            // focusContent + getNativeTabSlotSentinels
  escapeHandlers: {
    close: () => { safeOnClose(); return "handled"; },
  },
};
```

Engagement: the trap is entered from the dialog container's ref callback (`enterTrap()` on first attach), not a mount `useEffect`. react-modal's `ModalPortal` defers committing its children until after its own `componentDidMount`, so the ref callback is the reliable "container DOM is attached" signal; the same callback also wires the trap's `containerRef`. A `useRef` guard ensures `enterTrap()` runs only on the first attach. With `cycleOrder: ["close", "content"]`, `enterTrap` focuses the close button (programmatic entry into a non-content slot — normal focus, no landing mode needed). The user's first forward Tab cycles to the iframe-slot via the **before-sentinel positioner** (a live-keydown entry — descends natively into the iframe's first focusable). Shift+Tab from the close button **wraps** to the iframe-slot — this is programmatic cycling, so the iframe-slot enters **landing mode** on the **after-sentinel** (top-left overlay hint); the user's next Tab descends to the iframe's last focusable.

**Avoiding double-close.** The trap's `strategy.onExit` fires on Escape exit, on `exitTrap()`, **and** on unmount cleanup if still trapped. Every dismiss path here unmounts `DialogOverlay`, so if `onExit` also called `onClose` we'd race the unmount cleanup. Instead: use a slot-specific `escapeHandlers.close` (returns `"handled"` to suppress the default exit) and wire every other dismiss path (close-button click, overlay click) through the same `safeOnClose` — a ref-guarded one-shot wrapper around `onClose`. `strategy.onExit` is left unset; the trap's unmount cleanup is a no-op.

react-modal flags on the `<Modal>`:

- `shouldFocusAfterRender={false}` — suppress react-modal's auto-focus; `enterTrap()` places focus.
- `shouldReturnFocusAfterClose={false}` — react-modal won't try to restore on unmount; we own that.
- `shouldCloseOnEsc={false}` — the trap owns Escape via the `close`-slot `escapeHandlers`.
- `onRequestClose={notCloseable ? undefined : safeOnClose}` — overlay-click stays at react-modal's default (`shouldCloseOnOverlayClick` true), but for `notCloseable` dialogs `onRequestClose` is left undefined so the click is a no-op; closeable dialogs dismiss through `safeOnClose`.
- `contentLabel={title || "Dialog"}` — accessible name for the modal content. `managed-interactive.tsx` passes `iframeRuntimeProps.iframeTitle` (e.g. "Question 3 … content") as `title`, so a screen reader announces a distinguishable name rather than the generic "Dialog".

### 3. `managed-interactive.tsx` — wire DialogOverlay, restore focus on close

Replaces the existing block:

```tsx
activeDialog &&
  <Modal isOpen={true} appElement={getModalContainer()} onRequestClose={…}>
    { interactiveIframeRuntime }
  </Modal>
```

with:

```tsx
activeDialog &&
  <DialogOverlay
    url={activeDialog.url || …}
    title={iframeRuntimeProps.iframeTitle}
    notCloseable={activeDialog.notCloseable}
    onClose={handleCloseDialog}
    iframeRuntimeProps={iframeRuntimeProps}   // same shape as today
    iframeRuntimeRef={iframeRuntimeRef}
  />
```

To avoid duplicating the long `IframeRuntime` prop list at the call site, factor it into a local `iframeRuntimeProps` object computed once. Both the inline render and the dialog render consume it (today the same `interactiveIframeRuntime` JSX is reused for both — same pattern, just split into props rather than JSX).

**Focus restoration on close** (temporary AP-110 approach): in a `useEffect` that watches `activeDialog`, when it transitions from non-null to null, call `iframeRuntimeRef.current?.getIframeElement()?.focus()` — coarse restore to the originating iframe element, matching the parent spec's non-cooperating fallback.

> **Future (deferred):** the proper approach is to wrap every page-level `iframe-runtime` in an iframe-slot (no trap, just the slot mechanics) and call `requestRestore()` on the originating slot on close. Non-cooperating: the landing hint appears on the originating iframe. Cooperating: the protocol's `focusEnter { mode: "restore" }` re-focuses whatever element opened the dialog (e.g. the image question's "Annotate" button). This AP-110 fallback is placeholder code, intended to be replaced.

### 4. Package

Add to `package.json` `dependencies`:

```json
"@concord-consortium/accessibility-tools": "0.2.0-pre.0"
```

No `AccessibilityProvider` is wired for AP-110 — `useFocusTrap`'s debug context is optional.

## Behavior matrix (AP-110)

| User action | Result |
|---|---|
| Dialog opens (interactive posts `showModal { type: "dialog" }`) | `DialogOverlay` mounts; trap engages; focus on close button. |
| Tab from close button | Before-sentinel positioner → native descent → iframe's first focusable. |
| Tab through iframe content past last focusable | Native Tab lands on after-sentinel (tabbable because `focusInsideIframe === true`) → trap cycles to next slot → close button (wrap). |
| Shift+Tab from iframe's first focusable | Native Shift+Tab lands on before-sentinel → trap cycles to previous slot → close button (wrap). |
| Shift+Tab from close button | Programmatic cycle to iframe-slot → after-sentinel landing hint visible at top-left of iframe; next Tab descends to iframe's last focusable. |
| Escape while focus is on close button | Trap's Escape handler → `onExit` → `onClose` → dialog dismisses; coarse focus restore to originating iframe element. |
| Escape while focus is **inside** iframe | Nothing — parent never sees it (non-cooperating). User dismisses via close button or in-iframe controls. |
| Click close button | `onClose` → dialog dismisses. |
| Click outside modal (overlay) | react-modal `onRequestClose` → `onClose` → dialog dismisses. |
| Interactive posts `closeModal({ uuid })` (e.g. image-question Cancel/Done) | Existing path; dialog dismisses. |
| `notCloseable: true` | Trap engages; no close button rendered; cycle order is `["content"]` only; iframe Tab cycles wrap to landing on the iframe-slot. Pre-existing hard-lock for keyboard users without an in-iframe dismiss control. |

## Testing

- **Unit (jest + jsdom):**
  - `iframe-runtime.test.tsx` updated for the new DOM (sentinels around the iframe). Inline render: sentinels present, `tabindex="-1"`, no listeners; iframe still functions as today.
  - New `dialog-overlay.test.tsx`: modal renders; close button is present and focusable when `!notCloseable`; clicking close button calls `onClose`; trap engages on mount (assert via library debug context if wired, or via focus on the close button).
  - `managed-interactive.test.tsx` updated: dialog path renders `DialogOverlay`; closing the dialog triggers the focus-restoration fallback on the originating iframe element.
- **Deep iframe-slot mechanics** (sentinel toggling on `focusInsideIframe`, native-descent positioning, landing-mode focusout clearing) are already covered by `accessibility-tools`' own jsdom tests.
- **Manual verification** with the image-question interactive in dev:
  - Open the dialog from the interactive.
  - Tab forward through the dialog; confirm focus reaches the iframe content and cycles back to the close button.
  - Tab backward (Shift+Tab) from the close button; confirm the landing hint appears on the iframe's top-left, and the next Tab descends.
  - Activate Cancel/Done inside the interactive; confirm the dialog dismisses and focus lands on (or near) the originating iframe.
  - Click close button; confirm the dialog dismisses.
- **Cross-browser**: spot-check Chrome and Firefox (macOS) at minimum. Safari behaviors flagged in the parent spec (Full Keyboard Access dependency) carry over; re-verify if available.
- No Cypress/e2e additions in AP-110.

## Risks / open questions

- **Capability-detection timing carry-over.** AP-110 always uses the non-cooperating path. No `focusProtocol` handshake is consumed, so timing concerns from the parent spec don't apply yet. Follow-up AP-108 work will need to handle late-arriving capability without breaking entry/exit — the iframe-slot's positioner-default design already supports this.
- **Landing-hint visual occlusion.** The "Press Tab to enter…" hint covers the iframe's top-left content while shown. Acceptable for AP-110; revisit if a real overlap with important content is reported.
- **Focus restoration is coarse.** The temporary `iframe.focus()` fallback returns to the iframe element, not the exact control that opened the dialog. Replaced in a follow-up by the page-level iframe-slot + `requestRestore()` approach.
- **`notCloseable` keyboard hard-lock.** Pre-existing; not addressed here.
- **Sentinel screen-reader behavior.** Confirm SRs do not dwell on the at-rest sentinels and announce the landing hint usefully. The library tracks this as an AP-108 host concern; the static label text + `enterLabel` on `useIframeSlot` should cover the announcement path. Verify with a real SR pass during implementation.

## Implementation order (rough)

1. Add `@concord-consortium/accessibility-tools@0.2.0-pre.0` to `package.json`; `npm install`.
2. Update `iframe-runtime.tsx` and `.scss`: sentinel DOM, optional ref props, `composeRefs`, `getIframeElement` on the imperative API, `position: relative` on the wrapper. Update existing tests for the new DOM.
3. Add `dialog-overlay.tsx` with the trap, header, close button, and the modal config. Add `dialog-overlay.test.tsx`.
4. Update `managed-interactive.tsx`: extract `iframeRuntimeProps` object, replace the inline `<Modal>` with `<DialogOverlay>`, add the focus-restoration effect on close. Update existing tests.
5. Manual verification with image-question interactive across browsers; iterate on hint styling.
