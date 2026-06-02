# Focus Traps for Cross-Origin Interactives

**Jira**: https://concord-consortium.atlassian.net/browse/AP-208

**Status**: **Ready for review**

**Scope**: Activity Player (AP), with required supporting changes in `@concord-consortium/accessibility-tools` and `@concord-consortium/lara-interactive-api`.

## Summary

Add focus-trap support to Activity Player using the `accessibility-tools` library, for traps that contain a **cross-origin interactive** rendered in an iframe. The first target is the existing overlay containers — the **dialog** and **lightbox** modals — built on a **general `iframe-runtime` wrapper** so any iframe can later participate in a trap.

Two paths are supported:

- **Cooperating** — the interactive speaks a small **focus-coordination protocol** over the existing iframe-phone channel. This enables precise focus placement in both directions, including Escape-to-exit.
- **Non-cooperating** — the interactive does nothing. The AP uses **focus sentinels** around the iframe plus a `focusInsideIframe` state bit to recover *Tab-exit direction only*. There is no Escape-to-exit (impossible without cooperation); the keyboard escape hatch is a host-rendered focusable close control that this work must add — the overlays have no keyboard-accessible close today.

## For reviewers

This is a high-level, cross-repository design. Detailed implementation specs will be written per-repo (`accessibility-tools`, `lara-interactive-api`, `interactive-api-host`, `activity-player`) as separate follow-ups. For this review please focus on the architectural decisions:

- The cooperating / non-cooperating split and the protocol shape — [§ Background: why a protocol is unavoidable](#background-why-a-protocol-is-unavoidable), [§ The focus-coordination protocol](#the-focus-coordination-protocol), [§ Path 1](#path-1--cooperating-interactive), [§ Path 2](#path-2--non-cooperating-interactive).
- The library layering across repos and what lives where — [§ Architecture: layers](#architecture-layers), [§ Host code sharing across apps](#host-code-sharing-across-apps-library-layering), [§ Components by repository](#components-by-repository).
- The focus-category model — [§ Interactive focus categories & visual focus indication](#interactive-focus-categories--visual-focus-indication).

The following sections are background or deferred — skim if useful, but they aren't the decisions under review:

- [§ Background: how focus works with iframes in browsers](#background-how-focus-works-with-iframes-in-browsers) — empirical cross-browser findings that confirm feasibility; the design doesn't hinge on the matrix beyond "`tabIndex={-1}` is reliable."
- [§ Host-configured key forwarding](#host-configured-key-forwarding-shared-protocol-codap-driven) — not used by AP in this version; included because the shared host layer is the right home for it.
- [§ Open questions / risks](#open-questions--risks), [§ Out of scope](#out-of-scope-for-this-version), [§ Future direction](#future-direction-host-driven-focus-control-deferred) — known unknowns, scope boundaries, and deferred follow-ups.

## Background: how focus works with iframes in browsers

Before describing what coordination *requires*, it's worth establishing the native baseline. The focus-coordination protocol below exists to fill gaps the browser can't bridge on its own — sequential Tab across iframe boundaries is not one of those gaps.

**Sequential Tab and Shift+Tab cross iframe boundaries natively.** A forward Tab into an iframe lands on its first focusable element; subsequent Tabs walk that document; a Tab past the last focusable returns focus to the next focusable in the parent. Shift+Tab is symmetric — into the iframe lands on its last focusable, past its first returns to the previous parent focusable. This works cross-origin and requires no cooperation from the iframe's content.

(Safari gates webpage Tab navigation behind Full Keyboard Access / Option+Tab — a user-environment setting outside AP's control. See [open questions](#open-questions--risks).)

**iframe element `tabIndex` controls whether the parent treats the element as a tab stop; what "tab stop" *means* depends on whether the iframe has focusable content inside:**

| iframe `tabIndex` | iframe content | Behavior |
|---|---|---|
| `0` (or unset) | has focusable element(s) | Tab descends straight to first focusable (Shift+Tab → last); no separate stop on the iframe element. **All browsers same.** |
| `0` (or unset) | scrollable, no focusables | **Chrome and Firefox:** scroll container is focused per [keyboard-focusable scrollers](https://developer.chrome.com/blog/keyboard-focusable-scrollers) (both origins). **Safari:** iframe's `<body>` is focused (both origins) — Safari does **not** implement the scrollers rule. |
| `0` (or unset) | empty (no scroll, no focusables) | **Chrome same-origin / Firefox same-origin / Safari (both origins):** iframe's `<body>` becomes activeElement (no visible focus ring). **Chrome cross-origin:** iframe is skipped entirely. **Firefox cross-origin:** iframe element itself receives focus (`document.activeElement` is the iframe element, confirmed via parent-page tracking; visible blue ring) — a real behavioral divergence from Chrome cross-origin. |
| `-1` | any (focusable, scrollable, or empty) | iframe is skipped entirely; the scrollers rule does **not** override `tabindex=-1`. Same regardless of origin or content. **Chrome, Safari, and Firefox all verified.** |

**Verification status:** Chrome (same-origin and cross-origin), Safari, and Firefox all verified empirically **on macOS only**. Windows and Linux are not yet tested — engine-level behavior (keyboard-focusable scrollers, `tabIndex={-1}` skip) is likely to carry, but OS-level keyboard navigation conventions can differ.

For non-cooperating content-only interactives the matrix has multiple sub-cases where Tab leaves focus in an unhelpful spot: the Chrome/Firefox scrollers rule (scrollable → scroller focused), Safari's body fall-through (scrollable or empty → body focused with no visible ring), Chrome and Firefox same-origin empty (body, no visible ring), and Firefox cross-origin empty (iframe element itself focused). The only case where Tab naturally skips is **Chrome cross-origin empty**. [Content-only](#content-only-setting) handles all of these uniformly by setting `tabIndex={-1}`, which skips the iframe in every browser tested (Chrome, Safari, Firefox).

**Firefox cross-origin `iframe:focus` CSS persistence quirk (does not affect AP).** Independent of where focus *lands*, Firefox has a separable visual-state quirk on cross-origin iframes: the `iframe:focus` CSS state can persist after focus moves to another parent element (observed during normal Tab traversal when the iframe element itself was the focus target, as in empty cross-origin), and can be re-applied by switching browser tabs with focus left inside a cross-origin iframe (observed for any cross-origin iframe regardless of where inside it focus is). Only a page reload clears the phantom state. This is purely CSS state — `document.activeElement` updates correctly throughout (verified via parent-page tracking), and AP's [focus ring](#focus-ring) is driven by `focus`/`blur` events on the iframe element rather than the `:focus` selector, so the quirk has no functional impact on AP's trap or the indicator AP draws.

Any "entering a frame" announcement comes from the screen reader's frame-boundary handling, not from a focus stop on the iframe element itself.

## Background: why a protocol is unavoidable

The core constraint is the browser's same-origin policy and how focus/keyboard work across browsing contexts:

1. **Each document has its own `activeElement`.** When focus is inside an iframe, the parent's `document.activeElement` is the `<iframe>` element; the real focused element lives in the iframe's own document.
2. **The parent cannot reach across a cross-origin boundary.** It cannot enumerate or `.focus()` a specific element inside the interactive. `iframe.focus()` lands on the iframe *element*, not a chosen inner element or end.
3. **Keyboard events inside the iframe never reach the parent.** A capture-phase `document` `keydown` listener in AP does not fire for keystrokes that happen while focus is inside the iframe (true for cross-origin; also true for same-origin since DOM events don't cross the document boundary). So AP literally cannot observe an Escape pressed inside the interactive.
4. **No browser API advances focus to "the next element."** There is no `focusNext()`; you must build a focusable list and call `.focus()`. Synthetic `Tab` key events do not move focus. No overlay element can capture keystrokes destined for the focused element inside the iframe — keyboard routes by focus, not by stacking.
5. **Existing focus libraries do not help.** `tabbable`/`focus-trap` are single-document and treat the iframe as one tab stop; `ally.js` can be pointed at a *same-origin* iframe's document but explicitly treats cross-origin iframe content as inert. None bridge the boundary.

Consequence: any focus action that must cross the boundary — and any trap-state one side needs to know about the other — requires explicit message passing. Plain sequential Tab does **not** need coordination; the browser crosses iframe boundaries natively. Coordination is needed only where a trap intercepts (`preventDefault`) and must place focus on the other side.

## Current state (what exists today)

- **`accessibility-tools`** exposes `useFocusTrap` (hook) and `FocusTrapController` (imperative), driven by a `FocusTrapStrategy` (slots, `tabHandlers`, `escapeHandlers`, `focusContent(entryMode)`, `onEnter`/`onExit`, `cycleOrder`, `getExternalElements`). Both are **single-document**: they listen on `document`, manage `tabindex` on a container's descendants, and release focus via `findNextFocusableOutside` (same document only). They have **no iframe awareness**. There is prior art in `docs/trap-composition.md` for slots that manage their own focus (e.g. data grids, CodeMirror) — an iframe is the same idea across an origin boundary.
- **Activity Player** talks to interactives via **iframe-phone** (`ParentEndpoint` in `iframe-runtime.tsx`) and `lara-interactive-api`. The iframe is rendered with `tabIndex={0}` (or `-1` when locked).
- **Overlays** (`managed-interactive.tsx`) render both **dialog** (wraps the same `iframe-runtime`) and **lightbox** (plain iframe/img) through **`react-modal`**, which ships its own DOM-scoped focus trap — and therefore already has the cross-origin blind spot.
- Activity Player has **no focus-trap code** of its own today. This is greenfield.

## AP modal/overlay features (the focus surface)

All AP overlays are **interactive-initiated**: the interactive calls `showModal(options)` (`lara-interactive-api`), which posts a `showModal` message; AP's `iframe-runtime` `addListener("showModal")` forwards it to `managed-interactive.tsx`, which routes on `options.type` (`ModalType = "alert" | "lightbox" | "dialog"`). The interactive dismisses an overlay with `closeModal({ uuid })`, or the user via a host affordance. So the interactive always *asks* the AP to open a dialog/lightbox/alert — the AP never opens one on its own.

There is no host-rendered, keyboard-focusable close control today (see the per-type notes). Providing one is part of this work, because it is the fallback exit for non-cooperating interactives.

### `dialog` — `IShowDialog { type, url, notCloseable? }`

- **Renders the interactive itself inside a `react-modal`.** AP re-mounts the same `iframe-runtime` at `activeDialog.url` (or the interactive's own URL + fragment) within the modal. On close, AP first requests the interactive's state, then unmounts.
- **Focus profile:** a cross-origin *interactive* iframe inside a trap — the full problem this spec addresses (cooperating or non-cooperating).
- **Close affordance:** **no explicit close button is rendered**; closing relies on `react-modal`'s `onRequestClose` (Escape / overlay click). react-modal's Escape is iframe-blind, so a keyboard user whose focus is inside a non-cooperating interactive **cannot close the dialog**. When `notCloseable` is set, `onRequestClose` is `undefined` → no close at all.

### `lightbox` — `IShowLightbox { type, url, title?, isImage?, size?, allowUpscale? }`

- **Renders static content** inside a `react-modal`: a plain `<iframe>` for a URL, or an `<img>` when `isImage`. It does **not** use `iframe-runtime` and the content is not an interactive — so a URL lightbox is effectively **always the non-cooperating path** (the content won't speak the protocol). The image case has no inner focus and is trivial.
- **Close affordance:** a `lightbox-close-icon` rendered as a **`<div onClick>` — not a `<button>`, not focusable, with no key handler → mouse-only**. There is no keyboard close today.

### `alert` — `IShowAlert { type, style: "correct" | "incorrect" | "info", title?, text? }`

- A **host-rendered informational modal** (no iframe). **Currently unsupported in AP:** `hostFeatures.modal.alert` is `false` and `showModal` falls back to `window.alert("alert modal type not implemented yet")`.
- As typed it is **display-only** — it returns no choice to the interactive.
- **Focus profile (when implemented):** *trapping* is the simplest case — a pure-AP modal with native elements, no cross-origin boundary. But focus must move into the alert on open and **return into the interactive on close**, and that restoration *does* cross the boundary (see [Focus restoration](#focus-restoration-after-ap-owned-overlays)). So even the "simple" alert needs the cooperating `focusEnter { mode: "restore" }` (or the `iframe.focus()` fallback).

### Possible additional case: a confirm dialog (OK / Cancel)

A dialog that presents OK/Cancel and returns the user's choice to the interactive is **not in the current API** — `alert` carries only `style`/`title`/`text` with no buttons or result. If added, its focus profile is the easy one (pure-AP modal, native focusable buttons, no iframe, no protocol). Listed here as likely future scope so the design accounts for it; it does not need the iframe machinery.

### Implications for this design

- The **non-cooperating escape hatch must be built, not assumed.** Today neither overlay offers a keyboard-focusable close: the lightbox close is a non-focusable `<div>`, and the dialog has none (relying on iframe-blind react-modal Escape). This work must add a real focusable close control to the interactive-bearing overlays.
- **`notCloseable` dialogs are a hard-lock risk.** A `notCloseable` dialog wrapping a non-cooperating interactive that traps Tab leaves no exit. The design must either keep a host-level focusable exit even when `notCloseable`, or restrict `notCloseable` to cooperating interactives.

## Architecture: layers

| Layer | Responsibility |
|---|---|
| `lara-interactive-api` | The concrete, typed protocol messages on the existing iframe-phone channel, plus client-side helpers. |
| `interactive-api-host` | **Shared host-side coordination** — a vanilla `FocusManager` (the iframe-phone ↔ protocol adapter) plus a nested-host relay, reusable by every host app. See [Host code sharing across apps](#host-code-sharing-across-apps-library-layering). |
| `accessibility-tools` | Trap mechanics + first-class **iframe-slot** (sentinels, `focusInsideIframe`, cycling), self-contained with no concord dependency. Used by hosts that trap. |
| host apps — AP, portal-report, CLUE, nested question-interactives | Create the iframe + `ParentEndpoint` (each in its own framework); compose the layers above; own trap *orchestration* (when/what to trap) and UI (close control, focus ring, react-modal, skip links). |

AP is the host built in **this version**; the other apps adopt the shared pieces as separate work.

**Why protocol is split from transport:** a non-React or non-library interactive must still be able to implement the protocol by hand. The library is a convenience, not a requirement. The protocol message *types* live in `lara-interactive-api` (typed, discoverable, already a shared dependency); `accessibility-tools` defines only an abstract transport boundary, and `interactive-api-host`'s `FocusManager` provides the concrete host-side implementation of it.

### iframe-slot support in `accessibility-tools` (the key extension)

The library's per-slot hooks (`tabHandlers`, `escapeHandlers`) all fire from its `keydown` listener, which never sees events inside the iframe. So the boundary must be handled on **`focusin`** (sentinels), which the current strategy does not expose, and `FocusTrapResult` currently has no "cycle to next/previous slot."

The library gains an **iframe-slot** abstraction that:

- Accepts element refs for the iframe and its `before`/`after` sentinels (AP renders the sentinel DOM; the library owns their focus *behavior*).
- Tracks `focusInsideIframe` from the iframe element's `focus`/`blur` events. These fire whenever the iframe's document gains or loses focus — regardless of whether focus arrived via native Tab, a click inside the iframe, or programmatic `iframe.focus()` — so click and programmatic focus changes keep `focusInsideIframe` correct without any special handling. The trap's `keydown` handler also reads `document.activeElement` lazily at Tab time rather than caching a "current slot," so non-Tab focus changes can't leave stale state behind.
- On sentinel `focusin`, drives its own slot cycling (it already owns `cycleOrder`).
- For cooperating iframes, speaks the protocol through an **injected transport** (`send(msg)` / `onMessage(cb)`), translating protocol messages ↔ trap actions.

This keeps all trap logic in one place and lets **AP (parent)** and **the interactive (child)** use the library symmetrically, each supplying its own transport adapter — on the host side that adapter is the shared `FocusManager` (see [Host code sharing across apps](#host-code-sharing-across-apps-library-layering)).

## The focus-coordination protocol

Carried as typed messages in `lara-interactive-api` over iframe-phone.

**Capability handshake.** The interactive declares focus-protocol support during init (e.g. a `focusProtocol` flag added to `supportedFeatures`). AP treats interactives that declare it as **cooperating** and all others as **non-cooperating**.

**Parent → child:**

- `focusEnter { mode: "forward" | "reverse" | "restore" }` — AP is handing focus to the interactive; it should focus locally: its **first** focusable element (`forward`), its **last** (`reverse`), or — for `restore` — the element it last had focused. `forward`/`reverse` solve the reverse-entry case (`Shift+Tab` into the iframe should land on the *last* element) that `iframe.focus()` cannot; `restore` is used when an AP-owned overlay that took focus from the interactive closes (see Focus restoration). The field name and `forward`/`reverse`/`restore` values mirror the library's `FocusContentContext.entryMode`.
- *(optional)* `trapStateChanged { active: boolean }` — informs the interactive whether a containing AP trap is engaged, so it can adjust its own behavior.

**Child → parent:**

- `focusExit { mode: "forward" | "reverse" | "escape" }` — the interactive hands focus back to AP. `forward`/`reverse` are **directional**: the interactive's trap reached a Tab boundary (Tab past its last element / Shift+Tab past its first) and, since it can't call `findNextFocusableOutside` across the boundary, asks AP to move focus to the next/previous slot. `escape` is **non-directional**: the user pressed Escape to leave the trap, and AP resolves the destination by context (close the modal and restore focus to its opener / pop an inline trap / move past the iframe). `escape` is the exit-side mirror of `restore`, and is **what makes Escape-to-exit work**. The interactive bubbles `escape` to AP only when its *own top-level* trap is being escaped — inner sub-traps handle Escape themselves first (cf. the library's `escapeHandlers` returning `"handled"` vs `"exit"`).
- *(optional)* `focusReady` — the interactive has mounted its focusable content and can accept `focusEnter`.

The message set is intentionally minimal; optional messages are listed for completeness and may be deferred.

## Path 1 — Cooperating interactive

- **Entry:** AP trap cycles to the iframe slot → posts `focusEnter { mode }` → interactive focuses the matching end locally (`forward`→first, `reverse`→last).
- **Exit (Tab boundary):** interactive trap hits its edge → posts `focusExit { mode: "forward" | "reverse" }` → AP moves to the adjacent slot.
- **Exit (Escape):** user presses Escape → interactive posts `focusExit { mode: "escape" }` → AP releases the containing trap (destination by context).
- Full affordance, including Escape-to-exit and correct reverse-entry.

## Path 2 — Non-cooperating interactive

- No messages are exchanged.
- The AP `iframe-runtime` wrapper renders `[before-sentinel][iframe][after-sentinel]`. The sentinels' tabbability is **toggled on the `focusInsideIframe` transition**: tabbable (`tabindex="0"`) only while focus is inside the iframe, inert (`tabindex="-1"`) at all other times. `focusInsideIframe` is tracked via the iframe element's `focus`/`blur` — the one cross-origin signal the parent can observe.
- **Entering the iframe is purely native.** The parent *cannot* programmatically place focus on an element inside a cross-origin iframe — `iframe.focus()` focuses only the iframe *element*, and the browser does not descend into content on a programmatic focus (descent happens only via native sequential navigation). Keeping the sentinels inert while focus is outside guarantees entry is delegated to the browser: a forward Tab descends to the iframe's first focusable, a backward Shift+Tab to its last.
- **Exiting is the only case the sentinels catch.** When focus enters the iframe, AP activates the sentinels. When the user then tabs out:
  - lands on the **after-sentinel** → forward exit → AP focuses the next trap target (next slot, or wrap to first) and deactivates the sentinels.
  - lands on the **before-sentinel** → backward exit → AP focuses the previous trap target (or wrap to last) and deactivates.

  The redirect target is always a *parent* element, which the AP can focus. The `focusInsideIframe === true` precondition makes a sentinel firing unambiguously an exit, so direction comes purely from **which sentinel fired** — no reliance on `relatedTarget` (nulled across a cross-origin boundary).
- **Sentinels are bumpers, never resting spots:** on `focusin` AP synchronously moves focus to the real target. Guard nodes are zero-size with no accessible name (a focusable element cannot be `aria-hidden`).
- **Programmatic focus into the interactive can only reach the iframe element** (`iframe.focus()`, e.g. for the overlay's initial focus); native Tab descends from there. This is the ceiling for non-cooperating interactives, and is browser-variable — a reason the cooperating `focusEnter { mode }` path is more precise.
- **No Escape-to-exit** (impossible without cooperation). The keyboard escape hatch is a host-rendered, focusable close control in the overlay, which this work must add — neither overlay offers one today (see [AP modal/overlay features](#ap-modaloverlay-features-the-focus-surface)). With it, a dumb interactive is never a hard lockout — except a `notCloseable` dialog, which has no exit (see open questions).

## Focus restoration after AP-owned overlays

When an interactive opens an **AP-owned modal** (most clearly the `alert`, but the same applies to any overlay that takes focus from the interactive), focus moves into that modal on open and **must return into the interactive on close**. This cannot happen automatically:

- Removing the focused modal element on close drops focus to `document.body`, **not** back to the prior element — restoration is always programmatic.
- No DOM-ordering or tab-order arrangement causes the browser to restore focus on close; restoration is a one-shot "focus the trigger," not a sequential-navigation event.
- The restore target lives inside the cross-origin iframe, which AP cannot focus directly.

Therefore:

- **Cooperating:** AP posts `focusEnter { mode: "restore" }` to the originating interactive when the overlay closes; the interactive refocuses the element it last had focused. The interactive (via its library integration) tracks its own last-focused element, captured when it loses focus as the overlay opens. AP knows which interactive to message because it knows which one called `showModal`.
- **Non-cooperating:** AP falls back to `iframe.focus()`, returning focus to the iframe *element*; the user resumes by Tabbing. Coarse — the exact inner control is not restored — but not stuck.

While an AP-owned modal is open it runs its own (trivial, pure-AP) focus trap; the alert needs no iframe machinery for trapping — only the restore-on-close path crosses the boundary.

## react-modal handling

For the interactive-bearing overlays, **disable react-modal's focus management** (its tab trap and auto-focus) and let the `accessibility-tools` trap own focus. Two traps would otherwise fight, and react-modal's is iframe-blind. react-modal continues to provide the portal, scrim, and overlay lifecycle; `accessibility-tools` provides focus behavior and the iframe-slot.

## Host code sharing across apps (library layering)

The same focus host-side logic is needed by every app that embeds interactives — AP, **portal-report** (report views), **CLUE** (tiles), and the **question-interactives** that embed *child* interactives. To avoid four implementations, the host side is split by what is genuinely app-agnostic.

**Findings (current embedding):**

- `interactive-api-host` is framework-agnostic vanilla TS using a manager idiom (`PubSubManager`/`JobManager`: `addInteractive(id, phone)`, coordinate over iframe-phone) — the ideal shape and home for a focus coordinator.
- **portal-report** already depends on `interactive-api-host` (types + `handleGetAttachmentUrl`) and has no focus code yet → low adoption cost.
- **CLUE** does *not* depend on `interactive-api-host` (raw iframe-phone), but **already traps tile focus with `accessibility-tools`' `FocusTrapController`** and detects iframe focus via window-blur — i.e. it hand-rolled the `focusInsideIframe` primitive, validating the approach and offering future de-duplication.
- **question-interactives** host children with iframe-phone `ParentEndpoint` directly and talk to their own parent via `lara-interactive-api` (client). `interactive-api-host` is already a (demo-only) dependency, so adopting it is feasible work, not a hard block.

**The split:**

- **`interactive-api-host` (shared, vanilla)** gets the host code: a `FocusManager` (pure message coordination — dispatch incoming `focusExit`/capability/`keyEvent` to app callbacks; send `focusEnter`/`restore` + key-forwarding config) plus a **nested-host relay** so a question-interactive forwards focus between its parent (client) and its children (host). This is identical across hosts and fits the existing manager pattern.
- **`accessibility-tools`** keeps the DOM trap + iframe-slot + sentinel/`focusInsideIframe` mechanics, self-contained (it must **not** depend on `interactive-api-host`). Only trapping hosts (AP, CLUE) use it; no consumer needs the boundary primitive without a trap.
- The two **compose in each app**, not via cross-import.

**question-interactives work:** the relay is new shared code, and running `FocusManager` alongside the `lara-interactive-api` client in one bundle needs verification — both set up iframe-phone endpoints, and their init/types must not collide. No hard conflict was found.

## Components by repository

**`accessibility-tools`**
- iframe-slot abstraction (sentinel management, `focusInsideIframe` tracking, sentinel-`focusin`-driven cycling).
- Abstract transport interface (`send`/`onMessage`) and the generic protocol semantics.
- Imperative additions to drive slot cycling from sentinel events (extending `FocusTrapResult` / strategy as needed).

**`lara-interactive-api`**
- Concrete typed focus messages (`focusEnter`, `focusExit`, optional `trapStateChanged` / `focusReady`).
- **(Shared, not consumed by AP)** Host-configured key forwarding: the config message + a `tinykeys`-based capture-phase matcher/forwarder helper interactives can use. See [Host-configured key forwarding](#host-configured-key-forwarding-shared-protocol-codap-driven).
- `focusProtocol` capability flag on `supportedFeatures`.

**`interactive-api-host`** (shared across host apps — see [Host code sharing](#host-code-sharing-across-apps-library-layering))
- `FocusManager`: vanilla iframe-phone ↔ protocol adapter following the `PubSubManager`/`JobManager` idiom (`addInteractive(id, phone, handlers)`); dispatches incoming `focusExit`/capability messages to app callbacks and sends `focusEnter`/`restore`.
- Nested-host relay for question-interactives (parent client ↔ child host).

**`activity-player`**
- `iframe-runtime` wrapper: renders sentinels, owns the iframe element ref, tracks `focusInsideIframe`, and toggles sentinel tabbability on that transition (tabbable only while focus is inside the iframe).
- Wires the shared `FocusManager` (from `interactive-api-host`) to the `accessibility-tools` trap — AP supplies callbacks, not its own transport implementation.
- Overlay integration in `managed-interactive.tsx` / `lightbox.tsx`: host the trap, disable react-modal focus management, and add a keyboard-focusable close control as the escape hatch.
- Capability detection wired to the existing `supportedFeatures` handling.

## iframe element `tabIndex` policy

The iframe element's `tabIndex` is **determined by static properties and never toggled at runtime by the focus system**: `-1` when the interactive is locked **or marked content-only** (see [Interactive focus categories](#interactive-focus-categories--visual-focus-indication)), `0` otherwise. Whether the interactive is cooperating or non-cooperating does **not** affect `tabIndex`; only locked/content-only do. The focus system never changes it to drive the trap or to track focus.

- `tabIndex={0}` matches current AP behavior and keeps content reachable. Note (empirically, Chrome): a single Tab moves **straight into the iframe's first focusable element** — `tabIndex={0}` does *not* add a separate stop on the iframe element, so there is no double-tab. Any "entering a frame" announcement comes from the screen reader's frame-boundary handling, not a focus stop on the element. The dynamic boundary behavior lives in the **sentinels**, not the iframe element. (Safari differs — see open questions.)
- "Which iframe was last focused" is tracked with `focus`/`blur` listeners (the `focusInsideIframe` signal), **not** by mutating `tabIndex` — the two concerns are orthogonal, and changing `tabIndex` to track would alter tab-order behavior as a side effect.
- `iframe.focus()` (the restore fallback) works regardless of `tabIndex`, since iframes are natively focusable.

**Requirement:** the trap's `setChildrenNonTabbable` matches `[tabindex]` and would otherwise clobber the iframe's `tabIndex={0}` to `-1` when a containing trap engages. The iframe-slot must be **excluded** from that sweep (treated as self-managed, like `tabHandlers` slots), so the trap never changes the iframe's `tabIndex`.

## Interactive focus categories & visual focus indication

Interactives fall into three categories, each with a clear tab-stop and focus-ring behavior:

| Category | Tab stop? | AP focus ring? | How AP knows |
|---|---|---|---|
| **Content-only** (no element that should receive focus) | No — `tabIndex="-1"` | No | A new **authored setting** on the interactive; a cooperating interactive may also declare it at runtime |
| **Cooperating** | Yes (message-driven entry) | No — preserves the integrated, "part of the page" feel; the interactive shows its own focus indicators | Capability handshake (`focusProtocol`) |
| **Non-cooperating, not content-only** | Yes | **Yes** | Default (no handshake, not flagged content-only) |

### Content-only setting

Some interactives are pure display content with nothing focusable. Today every iframe carries `tabIndex={0}`, so the user tabs to a meaningless stop. A new **authored "content-only" setting** marks such interactives so AP gives the iframe `tabIndex="-1"` — no tab stop, no ring.

- **Cross-browser status:** `tabIndex="-1"` on the iframe element is **fully sufficient in Chrome, Safari, and Firefox (verified empirically)** — it removes the iframe from the parent's tab sequence regardless of inner content, including scrollable elements that would otherwise trigger the [keyboard-focusable scrollers](https://developer.chrome.com/blog/keyboard-focusable-scrollers) rule in Chrome and Firefox (Safari doesn't implement that rule anyway). If a future browser is found to leak inner focusables through `tabIndex="-1"`, a cooperating content-only interactive can additionally suppress its own inner focusables.
- The setting is an **authoring-system change** (where the flag is stored and surfaced in the authoring UI), not only an AP runtime change.

### Focus ring (deferred — not implemented in this version)

For non-cooperating ∧ not content-only interactives, a keyboard user can lose track of where focus is: AP can't see which inner element is focused, and the interactive may not indicate focus itself. A parent-side ring drawn around the iframe when focus is inside would clarify "focus is somewhere in here."

**This version does not implement the ring.** No single gating condition is both correct cross-browser and consistent with modality conventions:

- **Gating on `focusInsideIframe` (the JS-tracked iframe focus/blur signal):** would show the ring whenever focus is inside — including for click-into-iframe. That contradicts the modality convention used by AP's other focus indicators (a focus ring after a mouse click feels wrong).
- **Gating on `iframe:focus-visible`:** what modality conventions would suggest, but empirically (Chrome / Firefox / Safari, macOS) the iframe element rarely matches `:focus-visible` when focus is inside its *content* — `:focus-visible` matches only when the user keyboard-focused the iframe element *itself*, which essentially doesn't happen because focus descends into content immediately. So this gate would suppress the ring almost always. (The exception is the [Firefox cross-origin `:focus` persistence quirk](#background-how-focus-works-with-iframes-in-browsers); not a basis for design.)
- **JS-tracked input modality + `focusInsideIframe`:** doable but adds host-side input-modality tracking that AP doesn't otherwise need. Cost vs. benefit isn't obvious without a concrete reported problem to motivate it.

The accessibility benefit remains real, so this is **deferred, not rejected**. Revisit when there's an authoring case where the ambiguity is reported as a real problem; at that point the JS-tracked-modality hybrid is the natural starting point.

**Related browser-behavior findings worth recording even though the ring is deferred:**

- **Input modality propagates cross-document in Chrome and Firefox.** Verified empirically (macOS) that a click inside an iframe switches the parent's modality to pointer (parent loses `:focus-visible` rings) and a Tab keypress anywhere switches it back to keyboard. So AP's own focus indicators (links, buttons, etc.) styled on `:focus-visible` automatically reflect the user's current mode regardless of which document the action occurred in — no special handling required.
- **Safari caveat: `:focus-visible` does not match elements *inside* iframes** (empirically verified, macOS Safari; related discussion at [w3c/csswg-drafts#11415](https://github.com/w3c/csswg-drafts/issues/11415)). It does match on the parent's iframe element and on parent-document elements. Interactives that style their own focus indicators on `:focus-visible` won't get them inside the iframe in Safari — they'd need to fall back to bare `:focus` styling, or polyfill `:focus-visible` with local event tracking inside the iframe (track `keydown` vs. `pointerdown` and toggle a class on `<body>`; CSS references both selectors, e.g. `button:focus-visible, body.kbd-focus button:focus`). No host API or cross-document signal is needed — the iframe sees its own focus and pointer events, and external modality changes that matter for the iframe also move focus out of it. Worth flagging for interactive authors.

- **Accepted limitation while deferred:** a non-cooperating interactive that does not show its own focus indicator gives no visible focus state for keyboard users tabbing through it. Mitigations: cooperating interactives show their own focus indicators (recommended); content-only interactives skip the iframe entirely.

## Host-configured key forwarding (shared protocol; CODAP-driven)

Separate from the focus protocol, and **not used by AP in this version**: a generic mechanism for a host to receive specific key events that occur while focus is inside an interactive, so the host can act on them (move focus, run app commands, etc.). It exists because interactives update slowly and are shared across hosts (AP, CLUE, CODAP) — the interactive ships **one** generic capability and each host configures what it wants without an interactive update. **AP configures zero forwarded keys**; CODAP is the immediate consumer.

This is distinct from the focus protocol: `focusEnter`/`focusExit` carry focus-trap *semantics the interactive interprets* (Tab/Escape within its own trap); key forwarding is **semantically neutral** — the interactive just matches and relays.

### Host-configured, not send-all

The host sends the interactive the set of key bindings it cares about; the interactive matches them locally and forwards only those, and — per binding — may `preventDefault` them locally so the interactive doesn't *also* act (the host **claims** the key). This is required because `postMessage` is asynchronous: the host cannot retroactively stop the interactive from acting on a key, so the interactive must know in advance which keys are claimed. (Forward-everything also floods the channel on typing-heavy interactives and leaks all typed input.)

### Key definition format & multi-key handling — `tinykeys`

Use [`tinykeys`](https://github.com/jamiebuilds/tinykeys) **v4.0.0** for platform-agnostic definitions and matching:

- Binding strings: `$mod+KeyZ` (`$mod` = Meta on Apple, Control elsewhere), modifier combos (`$mod+Shift+KeyK`), and **sequences** (`g i`, space-separated, with a press-to-press timeout). Keys are `KeyboardEvent.key`/`.code` (case-insensitive) or a `(regex)`.
- The host expresses its config in tinykeys binding strings; the interactive instantiates tinykeys on its **own** window (capture phase), forwarding matches to the host and `preventDefault`-ing the claimed ones.

**Use stock v4.0.0 — no fork.** v4.0.0 fixes the cross-iframe event issue that the davai fork worked around (stock v3 used `event instanceof KeyboardEvent`, which fails for events that crossed an iframe boundary into a *same-origin* host window — davai's situation, where it attaches tinykeys to the CODAP host window). For us this matters less anyway (the interactive runs tinykeys in its own same-realm document), but v4.0.0 removes the question entirely.

### Editable-element filter (`options.ignore`) — make it modifier-aware

v4.0.0 also adds a default `options.ignore` that **ignores keyboard events from `[contenteditable]`, `input`, `textarea`, and `select`** (unless that element is the `event.currentTarget`). Since we attach to the window, the default would suppress **every** configured hotkey while focus is in any editable field — which is wrong for our use, because host-claimed keys are mostly modified shortcuts (`$mod+Z`, `$mod+S`) and special keys (Escape, F-keys) that users expect to work *while* typing.

Disabling it entirely is also wrong — then a bare `n` or `/` would hijack typing. Follow the common convention (Mousetrap, GitHub, Gmail) via a **custom `options.ignore`**:

- **Suppress** in editable fields: unmodified/printable single-key and sequence shortcuts.
- **Allow** in editable fields: shortcuts with a **Ctrl/Meta/Alt** modifier, and dedicated keys (Escape, function keys).
- **Shift is not a "safe" modifier** — `Shift+A` is just a typed capital letter.

This filter applies only to **generic key forwarding**. The focus protocol's Tab/Escape are handled by the trap (not tinykeys), so Escape-to-exit still works in inputs. A per-binding `allowInEditable` override could be added later if a host ever needs an unmodified key to fire mid-edit.

### Definitions must be dynamically updatable

The forwarded-key config is **not init-only** — the host can update it at runtime and the interactive re-applies its tinykeys bindings. This supports changing host UI, and (below) keeps the door open for the future feature.

### Future (not now): interactive-registered global hotkeys

An interactive may eventually want to register a hotkey honored by the host **and other interactives on the page** (a shortcut that works regardless of which interactive has focus). This is **interactive-driven**, so it can be added later by extending the protocol and updating just that interactive — no need to build it now. Its only requirement on the present design is the dynamic-update capability above: registering such a key means the host updates the forward-config of itself and the other interactives at runtime. Noted now so the forwarding config isn't designed as init-only.

## Open questions / risks

- **Capability-detection timing.** The iframe loads asynchronously; the trap must behave correctly (as non-cooperating) until/unless `focusProtocol` is declared, and adapt if it arrives later.
- **Cross-browser native Tab traversal (Safari).** The non-cooperating path assumes native Tab enters and exits the iframe. **Testing update:** with Full Keyboard Access on (or Option+Tab when Safari's "Press Tab to highlight each item on a webpage" is off), Safari *does* enter cross-origin iframes, matching Chrome — the earlier "Safari can't enter cross-origin iframes" concern did not hold on the tested version. Two residual notes:
  - Safari gates webpage Tab navigation behind Full Keyboard Access / Option+Tab — a user-environment setting outside AP's control.
  - The specific element focused on entry differs when the interactive has **no focusable element**: Chrome focuses the scroll container per [keyboard-focusable scrollers](https://developer.chrome.com/blog/keyboard-focusable-scrollers) when one exists, falls back to body same-origin / skips entirely cross-origin when no scroller exists (**verified Chrome**); Firefox matches Chrome on the scrollers rule (**verified Firefox**), with one divergence — empty cross-origin focuses the iframe element itself rather than skipping; Safari focuses the iframe's `<body>` in both scrollable and empty cases regardless of origin — it does **not** implement the scrollers rule (**verified Safari**). This is **benign for the trap** — boundary detection doesn't care which inner element holds focus — but entry focus is non-deterministic across browsers for content-only interactives. The cooperating `focusEnter { mode }` path makes entry deterministic (the interactive focuses a chosen element).

  Re-verify on the specific Safari versions AP targets, but the non-cooperating path looks viable cross-browser.
- **Sentinel screen-reader behavior.** Confirm SRs do not dwell on or announce the guard nodes given the synchronous redirect.
- **Interactives that trap Tab internally without cooperating.** The genuine hard-lock case (AP hard-cycle + interactive captures Tab and never releases). Mitigation: the host-rendered focusable close control (which this work adds) as escape hatch, and not hard-cycling around non-cooperating iframes.
- **`notCloseable` dialogs.** With no close affordance, a `notCloseable` dialog around a non-cooperating interactive has no exit. Decide whether to keep a host-level focusable exit even when `notCloseable`, or restrict `notCloseable` to cooperating interactives.
- **Fullscreen reserves Escape.** While the page is fullscreen the browser consumes Escape to exit fullscreen (the keydown often isn't even dispatched), so Escape is unreliable for *any* trap exit — both the host trap's `focusExit { mode: "escape" }` and an **interactive's own inner traps** (which normally handle Escape entirely internally). A cross-origin interactive also **can't detect the host's fullscreen state** (its `document.fullscreenElement` is `null` when the host owns fullscreen), so it can't unilaterally switch keys. Mitigations needing no protocol change: (1) the required **focusable close control is fullscreen-safe** — Tab and Enter/Space still work; only Escape is reserved — and an interactive's inner modals should likewise expose a focusable dismiss control, so no one is hard-locked; (2) `navigator.keyboard.lock(["Escape"])` (Chromium-only) can route Escape to the focused iframe instead of exiting fullscreen (verify cross-origin). A *consistent keyboard dismiss key* across interactives in fullscreen would need new host→interactive coordination (configure the inner dismiss key, or a host "exit inner trap" command plus inner-trap-state reporting) — deferred, no AP-208 need.

## Out of scope (for this version)

- Page-level traps around regular inline interactives/embeddables (no such trap exists in AP today).
- Same-origin optimizations (directly listening on `iframe.contentWindow`) — possible for any same-origin AP iframes but not needed for cross-origin interactives.
- Nested/multi-level trap composition beyond the single overlay-contains-one-interactive case.
- AP consuming host-configured key forwarding (AP configures no forwarded keys; the capability is built in the shared layer for CODAP — see [Host-configured key forwarding](#host-configured-key-forwarding-shared-protocol-codap-driven)).
- Interactive-registered global hotkeys (a hotkey honored by the host and other interactives) — deferred; interactive-driven, addable later.
- **Protocol-level Escape-key customization — not for this version, with one real future exception.** Most cases where Escape isn't the sole trap exit need no knob: `focusExit { mode: "escape" }` carries *intent*, not a key, so the **interactive** chooses which key(s) emit it (or none — Jupyter/vim consume Escape internally; forced-decision dialogs simply never emit it), the **host** chooses what the intent does (and can ignore it, e.g. `notCloseable`), and alternate/extra exit hotkeys ride generic [key forwarding](#host-configured-key-forwarding-shared-protocol-codap-driven). The genuine exception is **fullscreen** (see open questions): the interactive can't detect the host's fullscreen state and can't unilaterally keep keys consistent, so a host wanting a uniform dismiss key across interactives' inner traps would need new host→interactive coordination. Deferred — not needed for AP-208.

## Future direction: host-driven focus control (deferred)

If host→interactive focus *control* is pursued later (the fullscreen dismiss-key consistency case, or tutor/coachmark features that focus the controls they highlight), these conclusions from design discussion should guide it. **None of this is in AP-208.**

- **Prefer a narrow command over key-rebinding.** For the fullscreen inner-trap case, an `exitInnerTrap` command — paired with the interactive *reporting that it has a dismissible inner trap* — is a cleaner first step than configuring the interactive's dismiss key: it opens the door to broader host-driven control, whereas key-rebinding only ever solves the key problem. Use key-rebinding only if the simplest possible fix is all that's wanted.
- **Commands invert the model — budget for feedback/state.** The rest of the protocol is "interactive owns its focus and *reports intent*"; a command has the host *drive* focus it cannot observe across the origin boundary. Commands therefore need a companion state/feedback channel to be reliable (e.g. inner-trap-active reporting, or where focus landed) — without it, host automation is blind and fragile.
- **Add commands one at a time, each from a concrete requirement.** Every cooperating interactive must implement each command correctly (and they update slowly), so resist bundling speculative ones in "while we're here."
- **The tutor primitive is *targeted* focus, not focus-advance.** A tutor highlighting a control needs to focus *that specific control*, which requires the interactive to expose addressable targets (stable IDs/roles) plus a "focus target X" command with feedback. A directional "advance focus" command is the wrong tool — it's blind, duplicates native Tab, and can't reliably reach a named control. Design targeted focus from real tutor requirements when they exist; do not pre-build focus-advance.
