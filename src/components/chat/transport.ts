// Chat transport abstraction + the no-backend DebugTransport.
//
// The `useChat` hook talks only to a `ChatTransport`, so the entire sidebar UI is buildable and
// reviewable with no report-service and no OpenAI key. The live FirestoreTransport swaps in behind
// the same interface with no UI changes.
import { Activity, Page } from "../../types";
import { assemblePageContext, renderPageContext, OrientationHints } from "../../utilities/chat-context";
import { ChatLogPayload, ChatLogSink, registerChatLogSink, unregisterChatLogSink } from "./chat-log-forwarder";

// Authoritative per-conversation status, mirrored from the per-page parent doc in the live path.
export type ChatStatus = "idle" | "generating" | "error";

// A segment of a debug turn's body: `note` is explanatory wrapper text; `payload` is the verbatim
// content that would actually be sent to the server (the system prompt, a log envelope) and is
// rendered monospace so it reads as data, distinct from the wrapper prose.
export interface DebugSegment {
  kind: "note" | "payload";
  text: string;
}

export interface ChatTurn {
  id: string;
  sender: "user" | "assistant";
  text: string;
  // optimistic user turn not yet confirmed by the backend (live path only)
  pending?: boolean;
  // `"debug"` marks a DebugTransport dry-run turn (would-be prompt / would-be forwarded log). The UI
  // renders these as a distinct diagnostic panel rather than a tutor bubble, and excludes them from
  // the "Tutor said:" live-region announcement. Absent on all live-path turns.
  variant?: "debug";
  // For debug turns: ordered note/payload segments for differentiated rendering. `text` still holds
  // the full concatenation (used for copy-to-clipboard and the live-region exclusion).
  debugSegments?: DebugSegment[];
}

// Join debug segments into the flat `text` used for copy + text assertions (blank line between).
const segmentsToText = (segments: DebugSegment[]): string => segments.map(s => s.text).join("\n\n");

export interface ChatTransport {
  // Subscribe to turn + status changes. Implementations should immediately emit current state.
  // Returns an unsubscribe function.
  subscribe(onTurns: (turns: ChatTurn[]) => void, onStatus: (status: ChatStatus) => void): () => void;
  // Write a user message (live path) / render what would be sent (debug path).
  sendUserMessage(text: string): Promise<void>;
}

export interface DebugTransportOptions {
  activity: Activity;
  page: Page;
  hints?: OrientationHints;
}

// DebugTransport composes the page context locally and renders "what would be sent" instead
// of calling any backend. No Firestore, no OpenAI. The conversation is SEEDED with the would-be
// page system prompt (page-derived part + the generic prompt; placeholder for the server-only sim
// map) so it appears immediately on open — including right after a page change, which re-keys the
// transport. Each send then echoes the message that would post.
export class DebugTransport implements ChatTransport, ChatLogSink {
  private turns: ChatTurn[] = [];
  private status: ChatStatus = "idle";
  private turnListeners = new Set<(turns: ChatTurn[]) => void>();
  private statusListeners = new Set<(status: ChatStatus) => void>();
  private seq = 0;

  constructor(private options: DebugTransportOptions) {
    // Seed the page system-prompt dry-run as the opening turn. Gating this behind the first *send*
    // meant a page change (fresh transport) showed only auto-forwarded interactive logs until the
    // student typed — the page prompt is the point of the debug view, so surface it up front.
    this.pushDebugTurn("debug-prompt", this.systemPromptSegments());
  }

  // Build + push a debug turn from note/payload segments, keeping `text` in sync for copy/assertions.
  private pushDebugTurn(idPrefix: string, segments: DebugSegment[]): void {
    this.turns.push({
      id: `${idPrefix}-${this.seq++}`,
      sender: "assistant",
      variant: "debug",
      debugSegments: segments,
      text: segmentsToText(segments),
    });
  }

  // The developer-role system prompt the report-service function sets once, on the first turn, is
  // composed server-side as: [server-only generic tutor prompt] + this page's context + [server-only
  // per-sim prompt fragment(s)]. Only the PAGE CONTEXT is client-derivable — the generic prompt and the
  // URL-keyed sim map live in report-service source (chat/generic-prompt.ts, chat/sim-prompts.ts) and are
  // never in the client bundle. So the dry run shows the REAL client-derived page context as a `payload`
  // segment (the function re-derives it identically), bracketed by `note` PLACEHOLDERS for the two
  // server-only pieces — making the client/server split legible without duplicating the prompt text.
  private systemPromptSegments(): DebugSegment[] {
    const ctx = assemblePageContext(this.options.activity, this.options.page, this.options.hints ?? {});
    const pageContextText = renderPageContext(ctx);
    return [
      { kind: "note", text: [
        "No backend is called — local dry run. The report-service function composes the developer-role",
        "system prompt as: [1] server-only generic tutor prompt + [2] this page's context (shown below) +",
        "[3] server-only per-sim prompt fragment(s). Only [2] is client-derivable; [1] and [3] are",
        "report-service-owned (not in the client bundle) and shown as placeholders.",
      ].join("\n") },
      { kind: "note", text: [
        "── [1] generic tutor prompt · server-only ──",
        "(placeholder — composed server-side from report-service chat/generic-prompt.ts; absent from the",
        "client bundle. It carries the tutoring stance, the never-reveal-answers rule, the activity-log",
        "hygiene clause, and the null-on-routine-observations rule.)",
      ].join("\n") },
      { kind: "note", text: "── [2] page context · client-derived (the real payload; the function re-derives it identically) ──" },
      { kind: "payload", text: pageContextText },
      { kind: "note", text: [
        "── [3] per-sim prompt fragment(s) · server-only ──",
        "(placeholder — none visible client-side; the function appends URL-matched fragments from",
        "report-service chat/sim-prompts.ts when a page's interactive matches the developer-maintained map.)",
      ].join("\n") },
    ];
  }

  subscribe(onTurns: (turns: ChatTurn[]) => void, onStatus: (status: ChatStatus) => void): () => void {
    // Register so log forwarding surfaces the would-be log payload in the dry-run view; the
    // returned cleanup unregisters it, tying the sink to the subscription lifecycle.
    registerChatLogSink(this);
    this.turnListeners.add(onTurns);
    this.statusListeners.add(onStatus);
    onTurns([...this.turns]);
    onStatus(this.status);
    return () => {
      this.turnListeners.delete(onTurns);
      this.statusListeners.delete(onStatus);
      unregisterChatLogSink(this);
    };
  }

  private emitTurns() {
    const snapshot = [...this.turns];
    this.turnListeners.forEach(l => l(snapshot));
  }

  private setStatus(status: ChatStatus) {
    this.status = status;
    this.statusListeners.forEach(l => l(status));
  }

  async sendUserMessage(text: string): Promise<void> {
    this.turns.push({ id: `debug-user-${this.seq++}`, sender: "user", text });
    this.emitTurns();
    this.setStatus("generating");

    // resolve on a microtask so subscribers see generating → idle transitions as in the live path
    await Promise.resolve();
    this.pushDebugTurn("debug-assistant", [
      { kind: "note", text: "[debug transport] Your message would be written as a `user` doc; the tutor's reply would render here." },
    ]);
    this.emitTurns();
    this.setStatus("idle");
  }

  // Log dry run: surface the would-be forwarded-log payload instead of writing a doc. The envelope
  // (what would actually be sent) is a `payload` segment; the framing line is a `note`.
  forwardLog(payload: ChatLogPayload): void {
    this.pushDebugTurn("debug-log", [
      { kind: "note", text: 'would forward activity log (as a role:"developer" observation):' },
      { kind: "payload", text: JSON.stringify(payload, null, 2) },
    ]);
    this.emitTurns();
  }
}
