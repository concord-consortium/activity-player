import { RequestTracker } from "./request-tracker";

const TEST_TIMEOUT = 3; // ms

const resolveAfter = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("RequestTracker", () => {
  let rt: RequestTracker;
  let timeoutHandler: jest.Mock;
  let successAfterTimeoutHandler: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    rt = new RequestTracker(TEST_TIMEOUT);
    timeoutHandler = jest.fn();
    successAfterTimeoutHandler = jest.fn();
    rt.timeoutHandler = timeoutHandler;
    rt.successAfterTimeoutHandler = successAfterTimeoutHandler;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("calls timeout handler when the request hasn't finished within max time", async () => {
    rt.registerRequest(new Promise(() => null));
    rt.registerRequest(new Promise(() => null));

    await jest.advanceTimersByTimeAsync(TEST_TIMEOUT - 1);
    expect(timeoutHandler).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(timeoutHandler).toHaveBeenCalledTimes(1);
    expect(successAfterTimeoutHandler).not.toHaveBeenCalled();
  });

  it("doesn't call timeout handler when the request has finished within max time", async () => {
    rt.registerRequest(resolveAfter(TEST_TIMEOUT - 1));
    rt.registerRequest(resolveAfter(TEST_TIMEOUT - 1));

    await jest.advanceTimersByTimeAsync(TEST_TIMEOUT + 1);
    expect(timeoutHandler).not.toHaveBeenCalled();
    expect(successAfterTimeoutHandler).not.toHaveBeenCalled();
  });

  it("calls both timeout handler and success after timeout when the request has finished AFTER max time", async () => {
    rt.registerRequest(resolveAfter(TEST_TIMEOUT + 1));
    rt.registerRequest(resolveAfter(TEST_TIMEOUT + 2));

    await jest.advanceTimersByTimeAsync(TEST_TIMEOUT);
    expect(timeoutHandler).toHaveBeenCalledTimes(1);
    expect(successAfterTimeoutHandler).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(successAfterTimeoutHandler).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(1);
    expect(timeoutHandler).toHaveBeenCalledTimes(1);
    expect(successAfterTimeoutHandler).toHaveBeenCalledTimes(1);
  });
});
