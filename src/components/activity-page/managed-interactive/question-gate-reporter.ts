import { ISupportedFeatures, IUnlockQuestionsMessage } from "@concord-consortium/lara-interactive-api";
import { GateEvent } from "../../../utilities/disabled-questions";

const kDeclarationWindowMs = 5000;
const kRestoreWindowMs = 1000;

/** Turns one interactive's messages and iframe events into the events its gate's status is built from. */
export class QuestionGateReporter {
  private declared = false;
  private declarationTimer: number | undefined;
  private restoreTimer: number | undefined;

  constructor(private report: (event: GateEvent) => void) {}

  /** The iframe loaded or the host sent initInteractive: the interactive gets a full window to declare. */
  restartDeclarationWindow() {
    if (this.declared) return;
    window.clearTimeout(this.declarationTimer);
    this.declarationTimer = window.setTimeout(() => this.report({ type: "declarationWindowEnded" }), kDeclarationWindowMs);
  }

  supportedFeatures(features: ISupportedFeatures, hasState: boolean) {
    if (!features.questionGating || this.declared) return;
    this.declared = true;
    window.clearTimeout(this.declarationTimer);
    this.report({ type: "declared", hasState });
    if (hasState) {
      this.restoreTimer = window.setTimeout(() => this.report({ type: "restoreWindowEnded" }), kRestoreWindowMs);
    }
  }

  unlock(options: IUnlockQuestionsMessage | undefined) {
    this.report({ type: "unlocked", restored: !!options?.restored });
  }

  dispose() {
    window.clearTimeout(this.declarationTimer);
    window.clearTimeout(this.restoreTimer);
  }
}
