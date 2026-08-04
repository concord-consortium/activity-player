// Live FirestoreTransport — the real transport behind the same interface as DebugTransport (no UI
// changes). Also carries the log `forwardLog` write path.
//
// Send:    ensure the per-page parent doc exists (owner fields ONLY — never `status`, which is
//          function-owned), then `add()` a `user` message doc with the client-sent refs +
//          display-only orientation hints + owner fields.
// Receive: onSnapshot on the messages subcollection (ordered by createdAt); render `user` +
//          non-null `assistant` docs. Reload restores history via the same subscription.
// Status:  onSnapshot on the parent doc's `status` — authoritative generating|idle|error.
//
// Both listeners are re-attachable. Firestore TERMINATES an onSnapshot listener after invoking its
// error callback, so a listener attached once in subscribe() is gone for the life of the mount after
// the first error — including the denied read of a not-yet-created parent doc, which happens on
// EVERY fresh page. See attachParent()/scheduleReattach().
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

// Bounded re-subscribe. Without it a single transient `unavailable` permanently kills the
// conversation until the student navigates away.
export const kMaxResubscribeAttempts = 5;
export const kResubscribeBaseMs = 1000;
// How long an unanswered `user` doc may sit before the wait is called a failure. Long enough to clear
// a cold start plus a slow generation, short enough that the student isn't left watching dots.
export const kReplyTimeoutMs = 75000;

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
  private onTurns?: (turns: ChatTurn[]) => void;
  // Per-listener read-failure flags (kept separate so a recovered listener clears only its own).
  private messagesReadError = false;
  private parentReadError = false;
  // False from the moment the parent listener errors (Firestore has torn it down) until it is
  // re-attached, so ensureParent() knows whether it needs to revive it.
  private parentListenerLive = false;
  private messagesAttempts = 0;
  private parentAttempts = 0;
  private retryTimers = new Set<ReturnType<typeof setTimeout>>();
  private replyTimer?: ReturnType<typeof setTimeout>;
  private replyTimedOut = false;
  // Id of the unanswered `user` doc the reply timeout is currently running against, so a NEW
  // unanswered message restarts the clock while an unchanged wait leaves it alone.
  private pendingUserId?: string;
  private disposed = false;

  constructor(private readonly opts: FirestoreTransportOptions) {}

  private emitStatus() {
    if (!this.onStatus) return;
    // The typing indicator means "the tutor is preparing a reply to the student's message" — driven by
    // an outstanding user turn (`awaitingReply`), NOT by the parent `status` field on its own. The
    // function also flips status→"generating" while SILENTLY processing forwarded interactive logs
    // (e.g. "scrolled out of view" telemetry) that yield a `userText:null` non-reply; keying the
    // indicator off that made "..." flash on open with no question asked. `error` stays authoritative.
    //
    // A failed read and a timed-out wait are both surfaced as `error` rather than left as a healthy
    // -looking idle/generating: a chat that will never render anything, and a wait that will never
    // end, are both tutor failures from the student's point of view.
    const failed = this.parentStatus === "error" || this.messagesReadError
      || this.parentReadError || this.replyTimedOut;
    const effective: ChatStatus = failed ? "error" : this.awaitingReply ? "generating" : "idle";
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

  // The messages subscription is a `list`, so there is no "the doc doesn't exist yet" case here: a
  // `permission-denied` always means the rules rejected the QUERY. Mapping it to `idle` (as the
  // shared handler used to) presented a chat that looked healthy and would never render anything,
  // evidenced only by a console warning. Treat every messages read failure as an error and retry.
  private onMessagesError(err: { code?: string; message?: string }) {
    console.warn(`[chat] messages read error (${err.code}):`, err.message);
    this.messagesReadError = true;
    this.emitStatus();
    this.scheduleReattach("messages");
  }

  // The parent read is a single-doc `get`, where `permission-denied` IS the expected benign case: on a
  // fresh page the parent doc is absent until the function creates it (first send), and the rules deny
  // an anonymous read of a missing doc — the same denial `ensureParent()` swallows. Treat that as
  // `idle` (no conversation yet) rather than "tutor unavailable"; any other code (network `unavailable`,
  // etc.) is a real read failure worth showing. Either way the listener is now dead, so re-attach:
  // otherwise the authoritative `status:"error"` is unreachable for the rest of this mount.
  private onParentError(err: { code?: string; message?: string }) {
    console.warn(`[chat] parent read error (${err.code}):`, err.message);
    this.parentListenerLive = false;
    if (err.code === "permission-denied") {
      this.parentStatus = "idle";
    } else {
      this.parentReadError = true;
    }
    this.emitStatus();
    this.scheduleReattach("parent");
  }

  // Exponential backoff, bounded so a genuinely broken conversation doesn't retry forever. A delivered
  // snapshot resets the counter, so only *consecutive* failures count toward the cap.
  private scheduleReattach(which: "messages" | "parent") {
    if (this.disposed) return;
    const attempts = which === "messages" ? ++this.messagesAttempts : ++this.parentAttempts;
    if (attempts > kMaxResubscribeAttempts) {
      console.warn(`[chat] ${which} listener gave up after ${kMaxResubscribeAttempts} attempts`);
      return;
    }
    const timer = setTimeout(() => {
      this.retryTimers.delete(timer);
      if (this.disposed) return;
      if (which === "messages") {
        this.attachMessages();
      } else if (!this.parentListenerLive) {
        this.attachParent();
      }
      // else: ensureParent() already revived the parent listener before this timer fired. That is the
      // COMMON fresh-page ordering — the denial schedules this retry, then the student's first send
      // creates the doc and re-attaches immediately. Re-attaching a live listener is pure churn: an
      // unsubscribe plus a fresh Firestore listen, and a re-delivered snapshot that can bounce the
      // status in the UI. The messages listener has no equivalent revival path, so it has no guard.
    }, kResubscribeBaseMs * Math.pow(2, attempts - 1));
    this.retryTimers.add(timer);
  }

  private attachMessages() {
    if (this.disposed) return;
    this.unsubMessages?.();
    // Estimate pending serverTimestamps so a just-sent doc orders correctly before the server
    // resolves it (otherwise it can momentarily sort to the top as null).
    this.unsubMessages = this.messagesQuery().onSnapshot(
      snapshot => {
        this.messagesAttempts = 0;
        this.messagesReadError = false;
        const turns: ChatTurn[] = [];
        let idx = 0;
        let lastUserIdx = -1;
        let lastAssistantIdx = -1;
        let lastUserId: string | undefined;
        snapshot.forEach(doc => {
          const d = doc.data({ serverTimestamps: "estimate" }) as any;
          if (d.kind === "user") {
            lastUserIdx = idx;
            lastUserId = doc.id;
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
        this.updateReplyTimeout(this.awaitingReply ? lastUserId : undefined);
        this.onTurns?.(turns);
        this.emitStatus();
      },
      err => this.onMessagesError(err)
    );
  }

  private attachParent() {
    if (this.disposed) return;
    this.unsubParent?.();
    this.parentListenerLive = true;
    this.unsubParent = this.parentRef().onSnapshot(
      doc => {
        this.parentAttempts = 0;
        this.parentReadError = false;
        const status = doc.exists ? (doc.data() as any)?.status : undefined;
        this.parentStatus = status === "generating" ? "generating" : status === "error" ? "error" : "idle";
        this.emitStatus();
      },
      err => this.onParentError(err)
    );
  }

  // A turn can be lost server-side with no `status:"error"` ever written — the function never fired, a
  // cold start timed out, or it crashed before the status commit. The newest doc is then an unanswered
  // `user` doc, so `awaitingReply` stays true and the typing indicator spins with no error and no
  // recovery; the 5-minute stale-lock reclaim doesn't help, because nothing re-triggers the function.
  // Time the wait out and surface an error so the student can retry.
  private updateReplyTimeout(pendingUserId?: string) {
    // An unchanged wait keeps its running clock; only a new (or cleared) unanswered message resets it.
    if (pendingUserId === this.pendingUserId) return;
    this.pendingUserId = pendingUserId;
    if (this.replyTimer) {
      clearTimeout(this.replyTimer);
      this.replyTimer = undefined;
    }
    this.replyTimedOut = false;
    if (!pendingUserId) return;
    this.replyTimer = setTimeout(() => {
      this.replyTimer = undefined;
      if (this.disposed || !this.awaitingReply) return;
      this.replyTimedOut = true;
      this.emitStatus();
    }, kReplyTimeoutMs);
  }

  subscribe(onTurns: (turns: ChatTurn[]) => void, onStatus: (status: ChatStatus) => void): () => void {
    this.onStatus = onStatus;
    this.onTurns = onTurns;
    this.disposed = false;
    // Emit the reset current state synchronously (per the ChatTransport contract) so a subscriber
    // that swapped from another conversation doesn't briefly show the previous one's status.
    this.parentStatus = "idle";
    this.awaitingReply = false;
    this.messagesReadError = false;
    this.parentReadError = false;
    this.replyTimedOut = false;
    this.pendingUserId = undefined;
    this.messagesAttempts = 0;
    this.parentAttempts = 0;
    onTurns([]);
    this.emitStatus();
    this.attachMessages();
    this.attachParent();
    return () => this.dispose();
  }

  // Registered only while the panel is OPEN (driven by the sidebar), never merely because we are
  // subscribed. The subscription stays alive while closed so the launcher's pending dot works, but a
  // closed panel that also forwarded logs wrote a Firestore doc and billed an OpenAI turn per
  // interactive log, for a conversation nobody was reading.
  setLogForwarding(enabled: boolean): void {
    if (enabled) {
      registerChatLogSink(this);
    } else {
      unregisterChatLogSink(this);
    }
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
        // The parent doc now exists, so a read of it is permitted. If the listener died on the
        // fresh-page denial (the common case — the doc was absent when subscribe() ran), revive it
        // here; otherwise the authoritative `status:"error"` would stay unreachable for this mount
        // and a failed turn would show as an endless typing indicator instead of an error.
        if (!this.parentListenerLive) this.attachParent();
      })();
      // Don't memoize a rejected attempt — clear it so a later send can retry. The rejection is
      // deliberately NOT rethrown: the expected failure here is the benign race above (the parent
      // already exists, so the rules reject our `create`), where the message `add()` that follows is
      // perfectly valid and must not be blocked by a "tutor unavailable" error. A genuine failure
      // (wrong owner fields, expired auth, network) fails that `add()` too, and THAT rejection
      // propagates out of `sendUserMessage()` to the UI error line — so callers still get a
      // deterministic error, raised by the write that actually matters. Warn so a real rules
      // regression is still diagnosable.
      this.parentEnsured = attempt.catch(e => {
        this.parentEnsured = undefined;
        console.warn("[chat] parent ensure failed (will retry on next send):", (e as Error)?.message);
      });
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
  // payload is already MC-enriched, spam-filtered and debounced by the forwarder.
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
        console.warn("[chat] log forward failed:", (e as Error)?.message);
      }
    })();
  }

  dispose(): void {
    this.disposed = true;
    this.unsubMessages?.();
    this.unsubParent?.();
    this.unsubMessages = undefined;
    this.unsubParent = undefined;
    this.parentListenerLive = false;
    this.retryTimers.forEach(t => clearTimeout(t));
    this.retryTimers.clear();
    if (this.replyTimer) {
      clearTimeout(this.replyTimer);
      this.replyTimer = undefined;
    }
    this.pendingUserId = undefined;
    this.onStatus = undefined;
    this.onTurns = undefined;
    unregisterChatLogSink(this);
  }
}
