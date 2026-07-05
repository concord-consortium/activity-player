// Live FirestoreTransport — the real transport behind the same interface as DebugTransport (no UI
// changes). Also carries the log `forwardLog` write path.
//
// Send:    ensure the per-page parent doc exists (owner fields ONLY — never `status`, which is
//          function-owned), then `add()` a `user` message doc with the client-sent refs +
//          display-only orientation hints + owner fields.
// Receive: onSnapshot on the messages subcollection (ordered by createdAt); render `user` +
//          non-null `assistant` docs. Reload restores history via the same subscription.
// Status:  onSnapshot on the parent doc's `status` — authoritative generating|idle|error.
import { getChatMessagesRef, getChatParentRef, chatServerTimestamp } from "../../firebase-db";
import { OrientationHints } from "../../utilities/chat-context";
import { ChatStatus, ChatTransport, ChatTurn } from "./transport";
import { ChatOwnerFields } from "./chat-eligibility";
import { ChatLogPayload, ChatLogSink, registerChatLogSink, unregisterChatLogSink } from "./chat-log-forwarder";

export interface FirestoreTransportOptions {
  key: string;
  activityId: string | number;
  pageId: string | number;
  ownerFields: ChatOwnerFields;
  activityUrl?: string;
  hints: OrientationHints;
}

export class FirestoreTransport implements ChatTransport, ChatLogSink {
  private unsubMessages?: () => void;
  private unsubParent?: () => void;
  private parentEnsured?: Promise<void>;
  // Combined status inputs: the authoritative parent `status`, plus an optimistic check on the RAW
  // doc stream (a just-sent `user` doc with no following doc yet). Using the raw stream — not the
  // filtered render list — means a `userText:null` reply clears "awaiting" even though it renders
  // nothing, so the typing indicator can't spin forever.
  private parentStatus: ChatStatus = "idle";
  private awaitingReply = false;
  private onStatus?: (status: ChatStatus) => void;

  constructor(private readonly opts: FirestoreTransportOptions) {}

  private emitStatus() {
    if (!this.onStatus) return;
    // The typing indicator means "the tutor is preparing a reply to the student's message" — driven by
    // an outstanding user turn (`awaitingReply`), NOT by the parent `status` field on its own. The
    // function also flips status→"generating" while SILENTLY processing forwarded interactive logs
    // (e.g. "scrolled out of view" telemetry) that yield a `userText:null` non-reply; keying the
    // indicator off that made "..." flash on open with no question asked. `error` stays authoritative.
    const effective: ChatStatus =
      this.parentStatus === "error" ? "error"
        : this.awaitingReply ? "generating" : "idle";
    this.onStatus(effective);
  }

  private messagesRef() {
    return getChatMessagesRef(this.opts.key, this.opts.activityId, this.opts.pageId);
  }
  // The messages subscription is a `list`, so the Firestore rules evaluate `studentWorkRead()` against
  // the QUERY, not a concrete doc. If the query isn't constrained by the owner field, `anonymousRead()`
  // can't be statically satisfied and evaluation falls through to `teacherOfContext()`, which derefs
  // `request.auth.token` — null on an anonymous (unauthenticated) run — and the whole read is denied
  // (surfacing as the generic "tutor unavailable"). Constraining by the owner field (exactly as
  // `getAnswerDocsQuery` does) lets the matching read branch short-circuit before touching null auth.
  // All doc kinds (user/assistant/log) carry owner fields, so nothing is filtered out.
  private messagesQuery() {
    const q = this.messagesRef().orderBy("createdAt");
    const { run_key, platform_user_id, platform_id } = this.opts.ownerFields;
    if (run_key) {
      return q.where("run_key", "==", run_key);
    }
    if (platform_user_id && platform_id) {
      return q.where("platform_user_id", "==", platform_user_id).where("platform_id", "==", platform_id);
    }
    return q;
  }
  private parentRef() {
    return getChatParentRef(this.opts.key, this.opts.activityId, this.opts.pageId);
  }

  // Snapshot read errors are NOT tutor failures — the authoritative tutor `error` arrives via the
  // parent doc's `status` field (the success path). A `permission-denied` here is the EXPECTED benign
  // case for a conversation that doesn't exist yet: on a fresh page the parent doc is absent until the
  // function creates it (first send), and the rules deny an anonymous read of a missing doc — the same
  // denial `ensureParent()` swallows. Treat it as `idle` (no conversation yet) rather than surfacing
  // "tutor unavailable". Any other code (network `unavailable`, etc.) is a real read failure worth
  // showing. Logged either way so a genuine rules regression is diagnosable without a network trace.
  private onReadError(where: string, err: { code?: string; message?: string }) {
    // eslint-disable-next-line no-console
    console.warn(`[chat] ${where} read error (${err.code}):`, err.message);
    this.parentStatus = err.code === "permission-denied" ? "idle" : "error";
    this.emitStatus();
  }

  subscribe(onTurns: (turns: ChatTurn[]) => void, onStatus: (status: ChatStatus) => void): () => void {
    this.onStatus = onStatus;
    // Emit the reset current state synchronously (per the ChatTransport contract) so a subscriber
    // that swapped from another conversation doesn't briefly show the previous one's status.
    this.parentStatus = "idle";
    this.awaitingReply = false;
    onTurns([]);
    this.emitStatus();
    // Register as the active log sink so handleLog forwarding reaches THIS page conversation while
    // it is mounted; dispose() (the returned cleanup) unregisters it.
    registerChatLogSink(this);
    // Estimate pending serverTimestamps so a just-sent doc orders correctly before the server
    // resolves it (otherwise it can momentarily sort to the top as null).
    this.unsubMessages = this.messagesQuery().onSnapshot(
      snapshot => {
        const turns: ChatTurn[] = [];
        let idx = 0;
        let lastUserIdx = -1;
        let lastAssistantIdx = -1;
        snapshot.forEach(doc => {
          const d = doc.data({ serverTimestamps: "estimate" }) as any;
          if (d.kind === "user") {
            lastUserIdx = idx;
            turns.push({ id: doc.id, sender: "user", text: d.text ?? "", pending: doc.metadata.hasPendingWrites });
          } else if (d.kind === "assistant") {
            lastAssistantIdx = idx;
            // `assistant` docs with userText === null are silent replies — they clear the wait but render nothing.
            if (d.userText != null) turns.push({ id: doc.id, sender: "assistant", text: d.userText });
          }
          // `log` docs render nothing and are ignored for the wait computation below.
          idx++;
        });
        // Awaiting a visible reply when the last typed `user` doc is newer than the last `assistant` doc
        // — i.e. a message with no (even silent, userText:null) reply after it yet. Index-based so a
        // trailing `log` doc (forwarded telemetry) neither clears it during a real wait nor pins it on
        // after a completed reply.
        this.awaitingReply = lastUserIdx > lastAssistantIdx;
        onTurns(turns);
        this.emitStatus();
      },
      err => this.onReadError("messages", err)
    );

    this.unsubParent = this.parentRef().onSnapshot(
      doc => {
        const status = doc.exists ? (doc.data() as any)?.status : undefined;
        this.parentStatus = status === "generating" ? "generating" : status === "error" ? "error" : "idle";
        this.emitStatus();
      },
      err => this.onReadError("parent", err)
    );

    return () => this.dispose();
  }

  // Create the parent doc once, with owner fields ONLY. The security rules disallow a client
  // `update` of the parent (only `create` is permitted), so a write over an already-existing parent
  // is rejected — which is why we only write when our read says it's absent. `merge: true` is
  // defense-in-depth: on the create it still writes just the owner fields, and it never blows away
  // the function-owned `status`/`conversationId` if a race or a looser rule ever let the write land.
  private ensureParent(): Promise<void> {
    if (!this.parentEnsured) {
      const attempt = (async () => {
        let exists = false;
        try {
          const snap = await this.parentRef().get();
          exists = snap.exists;
        } catch {
          // Reading a not-yet-existing parent is denied for anonymous runs (rules check owner
          // fields on the target doc) → treat as absent and create it.
          exists = false;
        }
        if (!exists) {
          // A racing create (or a function-created parent) makes this throw — the outer catch below
          // clears the memo so a later send retries the read (which will then see it exists).
          await this.parentRef().set({ ...this.opts.ownerFields }, { merge: true });
        }
      })();
      // Don't memoize a rejected attempt — clear it so a later send can retry.
      this.parentEnsured = attempt.catch(() => { this.parentEnsured = undefined; });
    }
    return this.parentEnsured;
  }

  async sendUserMessage(text: string): Promise<void> {
    await this.ensureParent();
    const { hints, ownerFields, activityUrl, activityId, pageId } = this.opts;
    await this.messagesRef().add({
      kind: "user",
      text,
      createdAt: chatServerTimestamp(),
      activityUrl,
      activityId,
      pageId,
      // display-only orientation hints (undefined fields are dropped via
      // ignoreUndefinedProperties, keeping the doc within the rules' field whitelist)
      sequenceTitle: hints.sequenceTitle ?? undefined,
      activityTitle: hints.activityTitle,
      activityIndex: hints.activityIndex,
      activityCount: hints.activityCount,
      ...ownerFields,
    });
  }

  // Forward an interactive log as a `kind:"log"` doc on the same per-page path. The
  // payload is already MC-enriched + spam-filtered by handleLog (managed-interactive).
  forwardLog(payload: ChatLogPayload): void {
    void (async () => {
      try {
        await this.ensureParent();
        await this.messagesRef().add({
          kind: "log",
          createdAt: chatServerTimestamp(),
          interactive_id: payload.interactive_id,
          interactive_url: payload.interactive_url,
          action: payload.action,
          value: payload.value,
          data: payload.data,
          ...this.opts.ownerFields,
        });
      } catch (e) {
        // Log forwarding is best-effort; never surface it on the student-facing error line.
        // eslint-disable-next-line no-console
        console.warn("[chat] log forward failed:", (e as Error)?.message);
      }
    })();
  }

  dispose(): void {
    this.unsubMessages?.();
    this.unsubParent?.();
    this.unsubMessages = undefined;
    this.unsubParent = undefined;
    this.onStatus = undefined;
    unregisterChatLogSink(this);
  }
}
