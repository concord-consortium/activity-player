import type { WrappedDBAnswer } from "../firebase-db";

type AnswerCallback = (answer: WrappedDBAnswer | null) => void;

type ErrorCallback = (error: Error) => void;

const subscribers: Record<string, AnswerCallback[]> = {};
const errorHandlers: Record<string, ErrorCallback[]> = {};

/**
 * A stand-in for firebase-db's answer watching that keeps every subscriber per ref id, so a test can
 * report an answer to all of them, as Firestore would. Use it from a jest.mock factory with `jest.requireActual`.
 */
export const answerWatchers = {
  watchAnswer: jest.fn((refId: string, callback: AnswerCallback, onError?: ErrorCallback) => {
    subscribers[refId] = [...(subscribers[refId] ?? []), callback];
    if (onError) errorHandlers[refId] = [...(errorHandlers[refId] ?? []), onError];
    return () => {
      subscribers[refId] = subscribers[refId].filter(c => c !== callback);
      errorHandlers[refId] = (errorHandlers[refId] ?? []).filter(c => c !== onError);
    };
  }),
  report: (refId: string, answer: WrappedDBAnswer | null) => (subscribers[refId] ?? []).forEach(callback => callback(answer)),
  fail: (refId: string, error: Error) => (errorHandlers[refId] ?? []).forEach(onError => onError(error)),
  reset: () => {
    Object.keys(subscribers).forEach(refId => delete subscribers[refId]);
    Object.keys(errorHandlers).forEach(refId => delete errorHandlers[refId]);
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
  getPortalData: () => undefined,
  getConfiguration: () => ({})
};
