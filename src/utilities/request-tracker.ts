export const DEF_TIMEOUT = 10000; // ms

export class RequestTracker {
  public timeout: number;
  public timeoutCount = 0;
  // Should be set by the client.
  public timeoutHandler: (() => void) | undefined;
  // Should be set by the client.
  public successAfterTimeoutHandler: (() => void) | undefined;

  constructor(timeout = DEF_TIMEOUT) {
    this.timeout = timeout;
  }

  private handleTimeout() {
    if (this.timeoutCount === 0) {
      // Notify client only once, when the first timeout happens.
      this.timeoutHandler?.();
    }
    this.timeoutCount += 1;
  }

  private handleSuccessAfterTimeout() {
    this.timeoutCount -= 1;
    if (this.timeoutCount === 0) {
      // Notify client only when all the pending requests are finished.
      this.successAfterTimeoutHandler?.();
    }
  }

  public registerRequest(requestPromise: Promise<any>) {
    let timeoutHappened = false;

    const timeoutId = window.setTimeout(() => {
      this.handleTimeout();
      timeoutHappened = true;
    }, this.timeout);

    requestPromise.then(() => {
      if (timeoutHappened) {
        // Request is finished after the timeout. 
        this.handleSuccessAfterTimeout();
      } else {
        // Request is finished within max time, just cancel the timeout.
        window.clearTimeout(timeoutId);
      }
    });
  }
}
