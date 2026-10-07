import type { WrappedDBAnswer } from "../firebase-db";

type AnswerCallback = (answer: WrappedDBAnswer | null) => void;

const subscribers: Record<string, AnswerCallback[]> = {};

/**
 * A stand-in for firebase-db's answer watching that keeps every subscriber per ref id, so a test can
 * report an answer to all of them, as Firestore would. Use it from a jest.mock factory with `jest.requireActual`.
 */
export const answerWatchers = {
  watchAnswer: jest.fn((refId: string, callback: AnswerCallback) => {
    subscribers[refId] = [...(subscribers[refId] ?? []), callback];
    return () => { subscribers[refId] = subscribers[refId].filter(c => c !== callback); };
  }),
  report: (refId: string, answer: WrappedDBAnswer | null) => (subscribers[refId] ?? []).forEach(callback => callback(answer)),
  subscriberCount: (refId: string) => (subscribers[refId] ?? []).length,
  reset: () => {
    Object.keys(subscribers).forEach(refId => delete subscribers[refId]);
    answerWatchers.watchAnswer.mockClear();
  }
};

/** The firebase-db functions a rendered page calls, with answers driven by `answerWatchers`. */
export const firebaseDbMock = {
  watchAnswer: answerWatchers.watchAnswer,
  getAnswer: () => Promise.resolve(null),
  watchQuestionLevelFeedback: () => () => undefined,
  getLegacyLinkedInteractiveInfo: () => () => undefined,
  createOrUpdateAnswer: jest.fn(),
  getPortalData: () => undefined
};

export const kSavedAnswer: WrappedDBAnswer = { meta: {} as WrappedDBAnswer["meta"], interactiveState: { saved: true } };
