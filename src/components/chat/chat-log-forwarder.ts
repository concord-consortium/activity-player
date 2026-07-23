// Cross-component bridge for forwarding interactive logs into the active page chat.
//
// `managed-interactive`'s `handleLog` lives in a different subtree from the ChatSidebar, so the
// mounted transport registers itself here as the single "active log sink" for the current page.
// handleLog builds an (MC-enriched, spam-filtered) payload and hands it to the sink. When no chat
// is mounted (flag off, unsupported page, etc.) there is no sink and forwarding is a no-op.

export interface ChatLogPayload {
  interactive_id: string;
  interactive_url: string;
  action: string;
  value?: unknown;
  data?: unknown;
}

export interface ChatLogSink {
  forwardLog(payload: ChatLogPayload): void;
}

// Viewport-visibility log actions emitted by the shared interactive runtime (not by any sim's domain
// logic) as an embeddable scrolls in/out of view. Exact strings so meaningful domain actions that merely
// contain "scroll" (e.g. "SliderScrolled") are NOT caught.
const VIEWPORT_VISIBILITY_ACTIONS = new Set(["scrolled into view", "scrolled out of view"]);

// Map an opaque multiple-choice choice id to its human label using the emitting embeddable's
// authored_state. MC logs carry only an opaque `target_value` ("2"), so without this the tutor
// reads "2" instead of "Overall increase". The choice shape is coded defensively — authored_state
// choice objects vary (`content` / `text` / `label`).
const mcChoiceLabel = (authoredState: any, choiceId: unknown): string | undefined => {
  const choices = authoredState?.choices;
  if (!Array.isArray(choices)) return undefined;
  const match = choices.find((c: any) => c != null && String(c.id) === String(choiceId));
  if (!match) return undefined;
  const label = match.content ?? match.text ?? match.label;
  return typeof label === "string" ? label : undefined;
};

// Build the payload to forward for one interactive log, or null to drop it. Pure + defensively
// coded (the MC field shape is an observed runtime contract, not a typed shape in this codebase).
export const buildForwardedLog = (params: {
  logData: any;
  interactiveId: string;
  interactiveUrl: string;
  authoredState?: any;
}): ChatLogPayload | null => {
  const { logData, interactiveId, interactiveUrl, authoredState } = params;
  const action = String(logData?.action ?? "");
  if (!action) return null;
  // precautionary generic spam drop (mouse-move/-button); a no-op for the pilot wildfire
  // sim but keeps lab/MW-style frameworks that do flood from fanning out into billed calls.
  if (/mouse/i.test(action)) return null;
  // Drop viewport-visibility telemetry the shared interactive runtime emits for ANY embeddable as it
  // scrolls in/out of view — zero tutoring value, and each one is a Firestore write + a report-service
  // wake-up (the dominant noise source in practice). Matched as EXACT strings, not a loose /scroll/,
  // so a real domain action like "SliderScrolled" is still forwarded.
  if (VIEWPORT_VISIBILITY_ACTIONS.has(action)) return null;

  let data = logData?.data;
  // MC choice-map enrichment (client-side; exposes nothing new — the client already holds
  // authored_state). Add the readable label alongside the opaque id rather than replacing it.
  if (data && data.target_name === "answer" && data.target_value != null && authoredState) {
    const label = mcChoiceLabel(authoredState, data.target_value);
    if (label) {
      data = { ...data, target_label: label };
    }
  }

  return { interactive_id: interactiveId, interactive_url: interactiveUrl, action, value: logData?.value, data };
};

// Convenience for callers (managed-interactive): build + forward to the active sink, if any.
export const forwardInteractiveLog = (params: {
  logData: any;
  interactiveId: string;
  interactiveUrl: string;
  authoredState?: any;
}): void => {
  const sink = getChatLogSink();
  if (!sink) return;
  const payload = buildForwardedLog(params);
  if (payload) sink.forwardLog(payload);
};

let activeSink: ChatLogSink | null = null;

export const registerChatLogSink = (sink: ChatLogSink): void => {
  activeSink = sink;
};

// Only clear if the caller is still the registered sink (avoids a late unmount clobbering a newer
// sink that registered during a page swap).
export const unregisterChatLogSink = (sink: ChatLogSink): void => {
  if (activeSink === sink) activeSink = null;
};

export const getChatLogSink = (): ChatLogSink | null => activeSink;
