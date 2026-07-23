// Presentational chat component.
//
// Lifts steps-copilot's Chat.tsx compose/optimistic/auto-scroll/refocus flow, but DROPS the
// NormalBubble-vs-CollapsedTurn log classification (forwarded logs render as nothing here). Adds an
// accessibility minimum bar: labeled composer + accessible send button, per-turn sender attribution
// in the DOM, a single aria-live region announced on assistant-message completion, an AT-exposed
// typing indicator, and a surfaced error row (never an infinite spinner).
import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { UseChatResult } from "./use-chat";
import { ChatTurn } from "./transport";

import "./chat.scss";

interface IProps {
  chat: UseChatResult;
  // Optional close/collapse affordance rendered in the header (wired by the wrapper).
  onClose?: () => void;
  closeLabel?: string;
  // Optional scope line ("<Activity>, Page N: <title>") prepended as a heading to the copied
  // transcript so a pasted conversation is self-describing. Purely for the copy output.
  transcriptTitle?: string;
}

// Build a plain-markdown transcript of the visible conversation for copy-to-clipboard: an optional
// scope heading (which page/activity this conversation is about) followed by each real turn labeled
// by speaker. Debug dry-run turns and empty turns are excluded; message bodies are copied verbatim so
// any formatting the tutor emits is preserved and the text still reads cleanly where markdown isn't
// rendered.
export const buildChatTranscript = (turns: ChatTurn[], title?: string): string => {
  const lines: string[] = [];
  if (title) lines.push(`### Tutor chat — ${title}`, "");
  for (const turn of turns) {
    if (turn.variant === "debug") continue;
    const text = turn.text.trim();
    if (!text) continue;
    lines.push(`**${turn.sender === "user" ? "You" : "Tutor"}:** ${text}`, "");
  }
  return lines.join("\n").trimEnd();
};

// A DebugTransport dry-run turn (would-be system prompt / forwarded log): rendered as a distinct
// diagnostic panel whose (often long) body is collapsed by default behind a toggle, so it doesn't
// swamp the demo. The title bar also carries a copy-to-clipboard control (copies the full body even
// while collapsed). Labeled for AT rather than given "Tutor said:" attribution.
const DebugTurn: React.FC<{ turn: ChatTurn }> = ({ turn }) => {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const bodyId = useMemo(() => `chat-debug-body-${uuidv4()}`, []);

  // Briefly confirm a successful copy, then revert to the icon.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(turn.text);
      setCopied(true);
    } catch {
      // clipboard API unavailable (older browser / insecure context) — no-op
    }
  };

  return (
    <div className="chat-debug" role="note" aria-label="Debug output" data-cy="chat-row-debug">
      <div className="chat-debug-header">
        <button
          type="button"
          className="chat-debug-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(o => !o)}
          data-cy="chat-debug-toggle"
        >
          <span className="chat-debug-caret" aria-hidden="true">{open ? "▾" : "▸"}</span>
          <span>debug · no backend called</span>
        </button>
        <button
          type="button"
          className="chat-debug-copy"
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy debug content"}
          data-cy="chat-debug-copy"
        >
          {copied
            ? <span className="chat-debug-copied" aria-hidden="true">✓</span>
            : <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>}
        </button>
      </div>
      {open &&
        <div id={bodyId} className="chat-debug-body" data-cy="chat-debug-body">
          {(turn.debugSegments ?? [{ kind: "note" as const, text: turn.text }]).map((seg, i) => (
            // `payload` = the verbatim content that would be sent to the server (monospace);
            // `note` = explanatory wrapper prose (the panel's sans font).
            <div key={i} className={`chat-debug-seg ${seg.kind}`}>{seg.text}</div>
          ))}
        </div>}
    </div>
  );
};

export const Chat: React.FC<IProps> = ({ chat, onClose, closeLabel, transcriptTitle }) => {
  const { turns, error, pending, sendMessage, header } = chat;
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Unique id so a <label htmlFor> stays valid even if two chat instances ever coexist.
  const inputId = useMemo(() => `chat-input-${uuidv4()}`, []);

  // Copy-to-clipboard: only offer it when there's real conversation to copy (skip debug/empty turns).
  const hasCopyableTurns = useMemo(
    () => turns.some(t => t.variant !== "debug" && t.text.trim()), [turns]);

  // Briefly confirm a successful copy, then revert to the icon.
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const handleCopy = async () => {
    const transcript = buildChatTranscript(turns, transcriptTitle);
    if (!transcript) return;
    try {
      await navigator.clipboard.writeText(transcript);
      setCopied(true);
    } catch {
      // clipboard API unavailable (older browser / insecure context) — no-op
    }
  };

  // Auto-scroll to the newest content.
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [turns, pending]);

  // Autofocus the composer when the chat opens (this component mounts only on a user-initiated open)
  // so a keyboard/SR user lands in the input ready to type, inside the labeled complementary region.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Also refocus the composer when a send *finishes* (sending true → false) so focus returns to the
  // input after the send button briefly takes it.
  const prevSending = useRef(sending);
  useEffect(() => {
    if (prevSending.current && !sending) inputRef.current?.focus();
    prevSending.current = sending;
  }, [sending]);

  // Latest completed assistant reply, for the polite live-region announcement. Debug dry-run turns
  // are diagnostics, not tutor speech, so they're excluded from the "Tutor said:" announcement.
  const lastAssistantText = useMemo(() => {
    for (let i = turns.length - 1; i >= 0; i--) {
      if (turns[i].sender === "assistant" && turns[i].variant !== "debug") return turns[i].text;
    }
    return "";
  }, [turns]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      await sendMessage(text);
    } catch {
      setInput(text); // restore so the student can retry (error surfaced by the hook)
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="chat" data-cy="chat" aria-label="Activity tutor chat">
      <header className="chat-header" data-cy="chat-header">
        <span className="chat-header-title">
          <span className="chat-header-icon" aria-hidden="true">💬</span>
          {header}
        </span>
        <span className="chat-header-actions">
          {hasCopyableTurns &&
            <button
              type="button"
              className="chat-copy"
              onClick={handleCopy}
              aria-label={copied ? "Copied" : "Copy conversation"}
              title={copied ? "Copied" : "Copy conversation"}
              data-cy="chat-copy"
            >
              {copied
                ? <span className="chat-copied" aria-hidden="true">✓</span>
                : <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
                       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>}
            </button>}
          {onClose &&
            <button
              type="button"
              className="chat-close"
              onClick={onClose}
              aria-label={closeLabel || "Close chat"}
              data-cy="chat-close"
            >
              ×
            </button>}
        </span>
      </header>

      <div className="chat-messages" ref={listRef} data-cy="chat-messages">
        {turns.length === 0 &&
          <div className="chat-empty" data-cy="chat-empty">Ask the tutor about this page.</div>}
        {turns.map(turn => (
          turn.variant === "debug"
            ? <DebugTurn key={turn.id} turn={turn} />
            : <div key={turn.id} className={`chat-row ${turn.sender}`} data-cy={`chat-row-${turn.sender}`}>
                {/* per-turn sender attribution in the DOM (the lifted UI conveyed sender by position+color only) */}
                <span className="visually-hidden">{turn.sender === "user" ? "You said:" : "Tutor said:"}</span>
                <div className={`chat-bubble ${turn.pending ? "pending" : ""}`}>{turn.text}</div>
              </div>
        ))}
        {(pending || sending) &&
          <div className="chat-row assistant" data-cy="chat-row-typing">
            <div className="chat-bubble typing" role="status" aria-label="Tutor is typing" data-cy="chat-typing">
              <span className="chat-typing-dots" aria-hidden="true">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </span>
            </div>
          </div>}
      </div>

      {/* single polite live region announcing the completed assistant reply */}
      <div className="visually-hidden" aria-live="polite" data-cy="chat-live">
        {!pending && lastAssistantText ? `Tutor said: ${lastAssistantText}` : ""}
      </div>

      {error && <div className="chat-error" role="alert" data-cy="chat-error">{error}</div>}

      <form className="chat-composer" onSubmit={onSubmit} data-cy="chat-composer">
        <label htmlFor={inputId} className="visually-hidden">Message the tutor</label>
        <input
          id={inputId}
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message the tutor…"
          disabled={sending}
          autoComplete="off"
          data-cy="chat-input"
        />
        <button
          type="submit"
          className="chat-send"
          disabled={sending || !input.trim()}
          data-cy="chat-send"
        >
          Send
        </button>
      </form>
    </section>
  );
};
