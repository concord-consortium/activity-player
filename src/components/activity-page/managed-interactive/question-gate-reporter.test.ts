import { GateEvent } from "../../../utilities/disabled-questions";
import { QuestionGateReporter } from "./question-gate-reporter";

describe("QuestionGateReporter", () => {
  let events: GateEvent[];
  let reporter: QuestionGateReporter;

  beforeEach(() => {
    jest.useFakeTimers();
    events = [];
    reporter = new QuestionGateReporter(event => events.push(event));
  });

  afterEach(() => {
    reporter.dispose();
    jest.useRealTimers();
  });

  it("ends the declaration window 5000 ms after it starts", () => {
    reporter.restartDeclarationWindow();
    jest.advanceTimersByTime(4999);
    expect(events).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(events).toEqual([{ type: "declarationWindowEnded" }]);
  });

  it("restarts the window on each restart", () => {
    reporter.restartDeclarationWindow();
    jest.advanceTimersByTime(3000);
    reporter.restartDeclarationWindow();
    jest.advanceTimersByTime(4999);
    expect(events).toEqual([]);
    jest.advanceTimersByTime(1);
    expect(events).toEqual([{ type: "declarationWindowEnded" }]);
  });

  it("reports a window that ended before a late restart, and again when the restarted window ends", () => {
    reporter.restartDeclarationWindow();
    jest.advanceTimersByTime(6000);
    expect(events).toEqual([{ type: "declarationWindowEnded" }]);
    reporter.restartDeclarationWindow();
    jest.advanceTimersByTime(5000);
    expect(events).toEqual([{ type: "declarationWindowEnded" }, { type: "declarationWindowEnded" }]);
  });

  it("cancels the window on a declaration, and opens no window after one", () => {
    reporter.restartDeclarationWindow();
    reporter.supportedFeatures({ questionGating: true }, false);
    reporter.restartDeclarationWindow();
    jest.advanceTimersByTime(10000);
    expect(events).toEqual([{ type: "declared", hasState: false }]);
  });

  it("settles nothing on supported features without question gating", () => {
    reporter.restartDeclarationWindow();
    reporter.supportedFeatures({ aspectRatio: 1 }, true);
    expect(events).toEqual([]);
    jest.advanceTimersByTime(5000);
    expect(events).toEqual([{ type: "declarationWindowEnded" }]);
  });

  it("ends the restore window 1000 ms after a declaration with state", () => {
    reporter.supportedFeatures({ questionGating: true }, true);
    jest.advanceTimersByTime(999);
    expect(events).toEqual([{ type: "declared", hasState: true }]);
    jest.advanceTimersByTime(1);
    expect(events).toEqual([{ type: "declared", hasState: true }, { type: "restoreWindowEnded" }]);
  });

  it("reports a second declaration not at all", () => {
    reporter.supportedFeatures({ questionGating: true }, false);
    reporter.supportedFeatures({ questionGating: true }, true);
    jest.advanceTimersByTime(1000);
    expect(events).toEqual([{ type: "declared", hasState: false }]);
  });

  it("reports every unlock, restored or not", () => {
    reporter.unlock({ restored: true });
    reporter.unlock({});
    reporter.unlock(undefined);
    expect(events).toEqual([
      { type: "unlocked", restored: true }, { type: "unlocked", restored: false }, { type: "unlocked", restored: false }
    ]);
  });

  it("cancels both windows when disposed", () => {
    reporter.restartDeclarationWindow();
    reporter.dispose();
    reporter = new QuestionGateReporter(event => events.push(event));
    reporter.supportedFeatures({ questionGating: true }, true);
    reporter.dispose();
    jest.advanceTimersByTime(10000);
    expect(events).toEqual([{ type: "declared", hasState: true }]);
  });
});
