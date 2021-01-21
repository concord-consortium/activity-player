import { RequestTracker } from "./request-tracker";

const TEST_TIMEOUT = 3; // ms

describe("RequestTracker", () => {
  it("calls timeout handler when the request hasn't finished within max time", (done) => {
    const rt = new RequestTracker(TEST_TIMEOUT);
    const timeoutHandler = jest.fn();
    const successAfterTimeoutHandler = jest.fn();
    rt.timeoutHandler = timeoutHandler;
    rt.successAfterTimeoutHandler = successAfterTimeoutHandler;

    rt.registerRequest(new Promise(() => null));
    rt.registerRequest(new Promise(() => null));
    setTimeout(() => {
      expect(timeoutHandler).toHaveBeenCalledTimes(1);
      expect(successAfterTimeoutHandler).not.toHaveBeenCalled();
      done();
    }, TEST_TIMEOUT + 1);
  });

  it("doesn't calls timeout handler when the request has finished within max time", (done) => {
    const rt = new RequestTracker(TEST_TIMEOUT);
    const timeoutHandler = jest.fn();
    const successAfterTimeoutHandler = jest.fn();
    rt.timeoutHandler = timeoutHandler;
    rt.successAfterTimeoutHandler = successAfterTimeoutHandler;

    rt.registerRequest(new Promise((resolve) => setTimeout(resolve, TEST_TIMEOUT - 1)));
    rt.registerRequest(new Promise((resolve) => setTimeout(resolve, TEST_TIMEOUT - 1)));
    setTimeout(() => {
      expect(timeoutHandler).not.toHaveBeenCalled();
      expect(successAfterTimeoutHandler).not.toHaveBeenCalled();
      done();
    }, TEST_TIMEOUT + 1);
  });

  it("calls both timeout handler and success after timeout when the request has finished AFTER max time", (done) => {
    const rt = new RequestTracker(TEST_TIMEOUT);
    const timeoutHandler = jest.fn();
    const successAfterTimeoutHandler = jest.fn();
    rt.timeoutHandler = timeoutHandler;
    rt.successAfterTimeoutHandler = successAfterTimeoutHandler;

    rt.registerRequest(new Promise((resolve) => setTimeout(resolve, TEST_TIMEOUT + 1)));
    rt.registerRequest(new Promise((resolve) => setTimeout(resolve, TEST_TIMEOUT + 2)));
    setTimeout(() => {
      expect(timeoutHandler).toHaveBeenCalledTimes(1);
      expect(successAfterTimeoutHandler).toHaveBeenCalledTimes(1);
      done();
    }, TEST_TIMEOUT + 3);
  });
});
