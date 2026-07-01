# AP-116: Host-side Cooperating Focus Protocol

**Jira**: https://concord-consortium.atlassian.net/browse/AP-116

**Parent design**: [AP-108-focus-traps-cross-origin-interactives.md](AP-108-focus-traps-cross-origin-interactives.md) — the cooperating protocol is the part of AP-108 that lets the iframe-slot coordinate focus with the interactive instead of relying solely on the sentinel/native fallback.

**Builds on**: [AP-110-dialog-overlay-focus-trap.md](AP-110-dialog-overlay-focus-trap.md) — AP-110 landed the non-cooperating dialog focus trap (sentinels + `useFocusTrap`/`useIframeSlot`). AP-116 supplies the optional `transport` those hooks already accept.

**Scope**: Activity Player host side only. AP builds a `FocusManager` transport for every interactive and consumes it in the **dialog** modal. The transport lets `useIframeSlot` use the cooperative focus flow when the interactive reports the `focusProtocol` capability, and fall back to the existing sentinel/native flow otherwise.

## Goal

Wire the host half of the cooperating focus protocol so that, in the dialog modal, an interactive that speaks the protocol can coordinate focus with the host (host sends `focusEnter`; interactive sends `focusExit`) rather than relying only on AP-110's sentinel-based trap. For interactives that do not speak the protocol, behavior is unchanged.

This is achieved with the minimum host code and **zero new conditional branches**: the transport is built unconditionally where the iframe-phone endpoint is already created, and only the dialog consumes it.

## Non-goals (deferred / out of scope)

- **Interactive (client) side** of the protocol — the `focusEnter` listener and `sendFocusExit` helpers in `@concord-consortium/lara-interactive-api` live in the interactives' own code, not in AP. AP only implements the host half.
- **Inline focus-restore-after-dialog** — the motivating case for wiring every interactive (restoring focus to the control in an inline interactive that opened a dialog, after the dialog closes) is **not** implemented now. Option A simply leaves the transport in place so this can be built later without rework.
- Cooperative focus on inline (non-dialog) interactives generally — the transport is built for them but intentionally unused.
- Lightbox / alert modals (unchanged from AP-110).
- Any change to AP-110's sentinel fallback behavior.

## Approach (chosen): Option A — build the transport everywhere, consume it only in the dialog

The iframe-phone `ParentEndpoint` is created unconditionally in the shared
[`iframe-runtime.tsx`](../src/components/activity-page/managed-interactive/iframe-runtime.tsx) effect (`phoneRef.current = new iframePhone.ParentEndpoint(...)`), on the same code path for inline and dialog interactives. `FocusManager`'s only dependency is that endpoint (`constructor(phone: IFocusPhone)`), and `ParentEndpoint` structurally satisfies `IFocusPhone` (`post` / `addListener` / `removeListener`).

So the natural seam is: whenever `iframe-runtime` makes a phone, also make its `FocusManager` and surface `focusManager.transport`. Only the dialog reads it.

`FocusManager` is **passive** — it only sends on request and only translates inbound wire messages to subscribers. An inline interactive with a `FocusManager` does nothing: no slot is subscribed, and a non-cooperating interactive never sends `focusExit`.

### Why Option A over "wire only in the dialog" (Option B)

The decision driver was least code / fewest branches.

- **Option A** adds the `FocusManager` construction unconditionally beside the existing phone construction and surfaces it through one optional callback prop. **Zero new conditionals.** Inline callers simply omit the callback.
- **Option B** (build the transport only for the dialog instance) requires a new flag prop threaded `dialog-overlay → managed-interactive (iframeRuntimeProps) → iframe-runtime`, plus an `if (flag) new FocusManager(...)` guard — strictly more branching, to *suppress* something that is otherwise free and harmless.

Rejected alternatives:

- **Expose the raw phone upward and build `FocusManager` in `dialog-overlay`** — more coupling (leaks the phone instead of a narrow `FocusTransport`) and the same parent/child mount-ordering to solve. The phone stays encapsulated in `iframe-runtime`.

## Components

### 1. `iframe-runtime.tsx` — build and surface the transport

Inside the existing phone effect (keyed on `[reloadCount, url]`), immediately after
`phoneRef.current = new iframePhone.ParentEndpoint(iframeRef.current, initInteractive)`:

- Construct `new FocusManager(phoneRef.current)` and store it in a ref (e.g. `focusManagerRef`).
- Call the new optional prop `onFocusTransportReady?.(focusManager.transport)`.

In that effect's cleanup (beside the existing `phoneRef.current.disconnect()`):

- `focusManagerRef.current?.destroy()` (removes the iframe-phone listeners it added).
- `onFocusTransportReady?.(undefined)`.

New optional prop on `IframeRuntime`:

```ts
import { FocusManager, FocusTransport } from "@concord-consortium/interactive-api-host";

onFocusTransportReady?: (transport: FocusTransport | undefined) => void;
```

The `FocusManager` is built **unconditionally** (no gating branch). The callback is the only optional part; `onFocusTransportReady?.(...)` is an optional-chained call, not a behavioral branch. Inline callers (`managed-interactive`) pass no callback, so the transport is built but never surfaced.

Because the effect re-runs on `[reloadCount, url]`, a phone rebuild (reload / url change) tears down the old `FocusManager` and builds a fresh one, re-firing the callback — so the dialog always holds the transport for the current phone.

### 2. `dialog-overlay.tsx` — consume the transport

- Hold the transport in state: `const [transport, setTransport] = useState<FocusTransport>();`
- Pass `onFocusTransportReady={setTransport}` through to the inner `IframeRuntime`.
- Pass `transport` into the existing `useIframeSlot({ ... })` call.

`useIframeSlot` already accepts an optional `transport?: FocusTransport` and re-subscribes when it changes; no other changes to the trap strategy are needed.

### 3. `managed-interactive.tsx` — unchanged

The inline `IframeRuntime` render is untouched. It passes no `onFocusTransportReady`, so its transport is built (Option A) but unused.

## Key correctness points

- **Mount ordering is a non-issue.** The child `IframeRuntime` builds the phone/transport after it mounts; the dialog receives it via the `setTransport` callback, re-renders, and `useIframeSlot` subscribes "late". `FocusManager` caches the last `capability` message and replays it to a subscriber that attaches after it arrived, so a late subscription still sees the interactive's capability.
- **Non-cooperating interactives are safe.** Passing a transport is always safe: `useIframeSlot` chooses cooperative vs. sentinel/native flow based on the interactive's `capability` (`focusProtocol`) message, handled inside the library. With no capability, the AP-110 fallback is unchanged.
- **No leaked listeners.** `FocusManager.destroy()` runs on unmount and before each phone rebuild.

## Testing

- **iframe-runtime**: `onFocusTransportReady` is called with a transport on mount; `FocusManager.destroy()` (and `onFocusTransportReady(undefined)`) on unmount; transport is rebuilt and re-surfaced when the iframe reloads (`reloadCount` / `url` change).
- **dialog-overlay**: the surfaced transport reaches `useIframeSlot`; existing AP-110 sentinel-based focus-trap tests still pass when no capability is reported (fallback path unchanged).
- **Cooperative path**: with a mock phone emitting a `focusProtocol: true` capability followed by a `focusExit` wire message, the slot uses the cooperative flow.

## Dependencies

- `@concord-consortium/interactive-api-host` (provides `FocusManager`, `FocusTransport`, `IFocusPhone`) — brought in via yalc on this branch from `lara-typescript` `LARA-215-focus-testbed`.
- `@concord-consortium/accessibility-tools` `useIframeSlot` — already integrated in AP-110; its optional `transport` parameter is the consumption point.
