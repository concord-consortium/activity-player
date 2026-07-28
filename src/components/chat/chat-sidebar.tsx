// Dual-mode push/overlay wrapper + flag wiring.
//
// A shared <Chat> in one of two wrappers chosen by layout type (`fullWidth`):
//   - responsive (fullWidth) → PUSH: a 25% column; the responsive activity reflows to 75% (via a
//     body class — see chat-sidebar.scss). Closed → activity returns to full width.
//   - fixed-width → OVERLAY: a position:fixed right-edge drawer (activity untouched), states
//     closed / open. (A thin rail is a possible future enhancement, not built here.)
//
// BOTH modes set the `ap-chat-open` body class, which offsets AP's viewport-fixed right-edge UI (the
// "Did you know?" page-sidebar and the expandable container) out from under the panel. Only push adds
// `ap-chat-push-open`, which additionally reflows the activity itself.
//
// The mount gate (concrete content page + learner/anon identity) lives in app.tsx; this component
// assumes it is mounted only when appropriate, so `page.id` and identity are defined.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Page } from "../../types";
import { OrientationHints } from "../../utilities/chat-context";
import { resolveChatDebug } from "../../utilities/chat-flag";
import { Chat } from "./chat";
import { useChat } from "./use-chat";
import { ChatTransport, DebugTransport } from "./transport";
import { FirestoreTransport } from "./transport-firestore";
import { ChatIdentity } from "./chat-eligibility";

import "./chat-sidebar.scss";

interface IProps {
  fullWidth: boolean;       // true → responsive activity → push; false → fixed-width → overlay
  activity: Activity;
  page: Page;
  hints: OrientationHints;  // carries the authoritative 1-based pageNumber / pageCount (see app.tsx)
  identity: ChatIdentity;   // {source, key, ownerFields, activityUrl}
}

// djb2 — a stable, dependency-free string hash. Only used to namespace conversations for an activity
// with no `id` (see `activityId` below); nothing security-relevant depends on it.
const hashString = (s: string): string => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
};

export const ChatSidebar: React.FC<IProps> = (props) => {
  const { fullWidth, activity, page, hints, identity } = props;
  const push = fullWidth;
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  // An id-less activity falls back to a hash of its URL rather than a shared "standalone" literal,
  // which would namespace every id-less activity into the SAME conversation bucket. Unreachable on
  // the live path today (id-less sample activities have no activityUrl, so they take the debug
  // transport, and the server needs a real id) — this is just a safe default if that ever changes.
  const activityId = activity.id
    ?? (identity.activityUrl ? `url-${hashString(identity.activityUrl)}` : "standalone");
  // Chat requires a real URL-based activity fetchable server-side; the bundled sample activities
  // aren't, so fall back to the debug transport when there's no activityUrl (or ?chatDebug).
  const useDebug = resolveChatDebug() || !identity.activityUrl;

  // Re-key the transport per page (activityId + pageId) → hard conversation swap on navigation.
  const transport: ChatTransport = useMemo(() => {
    if (useDebug) {
      return new DebugTransport({ activity, page, hints });
    }
    return new FirestoreTransport({
      key: identity.key,
      activityId,
      pageId: page.id,
      ownerFields: identity.ownerFields,
      // NOTE: consumed HOST-ONLY server-side — `resolveActivityUrl` rebuilds
      // `https://{host}/api/v1/activities/{id}.json` from the authoritative path param rather than
      // fetching what this anonymously-writable doc says (confused-deputy hardening). That is why the
      // two identity branches can hand over differently-shaped URLs harmlessly. Do not "normalize"
      // these into something the server's AUTHORING_HOSTS allowlist would reject.
      activityUrl: identity.activityUrl,
      hints,
    });
    // Depend on the PRIMITIVE hint/owner-field values (not the object identities) so the transport
    // rebuilds and picks up fresh orientation metadata when it loads asynchronously (e.g. sequence
    // title/index arriving after mount) — while still hard-swapping the conversation on page nav.
    // `identity.source` is deliberately in the deps but NOT passed to the transport: the Firestore
    // paths come from module-level `portalData`, so a change of effective source must rebuild the
    // transport (re-resolving those paths) even though nothing reads it here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    useDebug, identity.source, identity.key, activityId, page.id,
    identity.ownerFields.run_key, identity.ownerFields.platform_user_id,
    identity.ownerFields.platform_id, identity.ownerFields.context_id,
    hints.sequenceTitle, hints.activityTitle, hints.activityIndex, hints.activityCount,
  ]);

  // Note: teardown (Firestore unsubscribe + log-sink unregister) happens via the cleanup returned
  // from transport.subscribe(), which useChat calls on transport change / unmount — no separate
  // dispose effect is needed here.

  const header = "Ask the Tutor";
  const chat = useChat({ transport, header });

  // Forward interactive logs ONLY while the panel is open. The subscription itself stays alive when
  // closed (the launcher's pending dot reads it), but forwarding while closed wrote a Firestore doc
  // and billed an OpenAI turn for every interactive log a student generated without ever opening the
  // tutor — and the panel re-closes on every page nav, so most of that spend was on conversations
  // nobody read. It also contradicts the spec's reason for keeping student answers out of the system
  // prompt, which is that chat-closed work is unobserved.
  useEffect(() => {
    if (!open) return;
    transport.setLogForwarding(true);
    return () => transport.setLogForwarding(false);
  }, [transport, open]);

  // Scope line prepended to the copied transcript so a pasted conversation is self-describing.
  // (Only used for copy output; the visible header stays "Ask the Tutor".) The page number comes from
  // the same `hints` the page context is built from, so the transcript and the tutor's own
  // "Page N of M" can never disagree.
  const pageTitle = page.name?.trim();
  const pageLabel = hints.pageNumber != null ? `, Page ${hints.pageNumber}` : "";
  const transcriptTitle = pageTitle
    ? `${activity.name}${pageLabel}: ${pageTitle}`
    : `${activity.name}${pageLabel}`;

  // Default to closed whenever the conversation swaps (page nav) or the wrapper changes. Mark the
  // close as nav-driven so focus is NOT yanked to the launcher (see the focus effect).
  const closedByNav = useRef(false);
  useEffect(() => {
    closedByNav.current = true;
    setOpen(false);
  }, [activityId, page.id, push]);

  // Focus management: on a user-initiated open, focus lands on the composer input (autofocused by
  // <Chat> on mount), which sits inside this labeled panel. On a user-initiated close, restore focus
  // to the launcher. Skip the restore on initial mount and on nav-driven auto-close so a keyboard/SR
  // user reading page content isn't yanked to the launcher when they change pages.
  const prevOpen = useRef(open);
  useEffect(() => {
    if (!open && prevOpen.current && !closedByNav.current) {
      launcherRef.current?.focus();
    }
    closedByNav.current = false;
    prevOpen.current = open;
  }, [open]);

  // Body classes: `ap-chat-open` in BOTH modes offsets AP's viewport-fixed right-edge UI out from
  // under the panel; `ap-chat-push-open` additionally reflows the responsive activity to make room
  // (see chat-sidebar.scss). Overlay mode never reflows the activity.
  useEffect(() => {
    if (!open) return undefined;
    const classes = push ? ["ap-chat-open", "ap-chat-push-open"] : ["ap-chat-open"];
    document.body.classList.add(...classes);
    return () => document.body.classList.remove(...classes);
  }, [push, open]);

  if (!open) {
    return (
      <button
        ref={launcherRef}
        type="button"
        className={`chat-launcher ${push ? "push" : "overlay"}`}
        aria-expanded={false}
        aria-label="Open activity tutor chat"
        onClick={() => setOpen(true)}
        data-cy="chat-launcher"
      >
        <span aria-hidden="true">💬</span>
        <span className="chat-launcher-label">Tutor</span>
        {chat.pending &&
          <span className="chat-launcher-unread" role="status" aria-label="Tutor is typing" data-cy="chat-launcher-unread" />}
      </button>
    );
  }

  return (
    <div
      className={`chat-sidebar ${push ? "push" : "overlay"}`}
      role="complementary"
      aria-label="Activity tutor chat"
      // Escape closes the drawer, matching what users expect of one. Scoped to the panel (the event
      // bubbles up from the focused composer) rather than the document, so Escape elsewhere on the
      // page is untouched. Not a conformance requirement — this is a non-modal complementary region
      // with a labeled close button — but it is what a drawer should do.
      onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
      data-cy="chat-sidebar"
    >
      <Chat chat={chat} onClose={() => setOpen(false)} closeLabel="Close chat" transcriptTitle={transcriptTitle} />
    </div>
  );
};
