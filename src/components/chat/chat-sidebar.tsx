// Dual-mode push/overlay wrapper + flag wiring.
//
// A shared <Chat> in one of two wrappers chosen by layout type (`fullWidth`):
//   - responsive (fullWidth) → PUSH: a 25% column; the responsive activity reflows to 75% (via a
//     body class — see chat-sidebar.scss). Closed → activity returns to full width.
//   - fixed-width → OVERLAY: a position:fixed right-edge drawer (activity untouched), states
//     closed / open. (A thin rail is a possible future enhancement, not built here.)
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
  pageNumber: number;       // 1-based content page number (currentPage)
  hints: OrientationHints;
  identity: ChatIdentity;   // {source, key, ownerFields, activityUrl}
}

// TEMPORARY: the responsive push/reflow layout isn't finished, so force the overlay drawer for all
// activities while we test functionality. Flip back to `fullWidth` to re-enable push mode.
const kForceOverlay = true;

export const ChatSidebar: React.FC<IProps> = (props) => {
  const { fullWidth, activity, page, pageNumber, hints, identity } = props;
  const push = fullWidth && !kForceOverlay;
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activityId = activity.id ?? "standalone";
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
      activityUrl: identity.activityUrl,
      hints,
    });
    // Depend on the PRIMITIVE hint/owner-field values (not the object identities) so the transport
    // rebuilds and picks up fresh orientation metadata when it loads asynchronously (e.g. sequence
    // title/index arriving after mount) — while still hard-swapping the conversation on page nav.
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

  // Scope line prepended to the copied transcript so a pasted conversation is self-describing.
  // (Only used for copy output; the visible header stays "Ask the Tutor".)
  const pageTitle = page.name?.trim();
  const transcriptTitle = pageTitle
    ? `${activity.name}, Page ${pageNumber}: ${pageTitle}`
    : `${activity.name}, Page ${pageNumber}`;

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

  // Push reflow: toggle a body class so the responsive activity narrows to make room and
  // the viewport-fixed page-sidebar is offset (see chat-sidebar.scss). Overlay mode never reflows.
  useEffect(() => {
    if (push && open) {
      document.body.classList.add("ap-chat-push-open");
      return () => document.body.classList.remove("ap-chat-push-open");
    }
    return undefined;
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
      ref={panelRef}
      tabIndex={-1}
      className={`chat-sidebar ${push ? "push" : "overlay"}`}
      role="complementary"
      aria-label="Activity tutor chat"
      data-cy="chat-sidebar"
    >
      <Chat chat={chat} onClose={() => setOpen(false)} closeLabel="Close chat" transcriptTitle={transcriptTitle} />
    </div>
  );
};
