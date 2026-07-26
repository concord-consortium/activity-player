// `useChat` hook.
//
// A partial rewrite of steps-copilot's `usePerformChat`: it keeps the compose/optimistic/serial
// shape but DROPS the `TurnKind`/`META_SENTINEL`/`LOG_SENTINEL`/`classify()` sentinel machinery —
// the live Firestore docs carry an explicit `kind`, and the structured `userText:null` reply
// replaces sentinel pairing. Transport-agnostic: it drives the sidebar off any `ChatTransport`
// (DebugTransport here; FirestoreTransport).
import { useCallback, useEffect, useState } from "react";
import { ChatStatus, ChatTransport, ChatTurn } from "./transport";

export interface UseChatResult {
  turns: ChatTurn[];
  status: ChatStatus;
  error: string | null;
  pending: boolean;
  sendMessage: (text: string) => Promise<void>;
  header: string;
}

export interface UseChatOptions {
  transport: ChatTransport;
  // "Chat about: Page N — <title>" — makes the per-page scoping legible.
  header: string;
}

export function useChat({ transport, header }: UseChatOptions): UseChatResult {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Re-subscribe whenever the transport instance changes — this is exactly the hard conversation
  // swap on page navigation (the sidebar re-keys the transport per page).
  useEffect(() => {
    // Reset transient UI state so a conversation swap (page nav) doesn't carry the previous page's
    // status/error into the newly-subscribed conversation before its first snapshot arrives.
    setError(null);
    setStatus("idle");
    setTurns([]);
    const unsubscribe = transport.subscribe(setTurns, setStatus);
    return unsubscribe;
  }, [transport]);

  // Surface an authoritative `status:"error"` as a visible error (rather than an infinite spinner).
  useEffect(() => {
    if (status === "error") {
      setError("The tutor is currently unavailable. Please try again.");
    }
  }, [status]);

  // Typing indicator follows the (effective) status. The live transport folds its optimistic
  // "a just-sent user message awaits a reply" check into the status it emits — computed from the raw
  // doc stream, so a silent `userText:null` reply clears it and it never spins forever.
  const pending = status === "generating";

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    try {
      await transport.sendUserMessage(trimmed);
    } catch (e) {
      setError((e as Error)?.message || "Failed to send your message. Please try again.");
      throw e;
    }
  }, [transport]);

  return { turns, status, error, pending, sendMessage, header };
}
