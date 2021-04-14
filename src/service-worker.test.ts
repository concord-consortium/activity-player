/**
 * @jest-environment ./src/test-utils/service-worker-environment.js
 */

// This is using service-worker-mock to unit test the service worker
// https://github.com/zackargyle/service-workers/tree/master/packages/service-worker-mock
// We can get pretty far just using JSDOM because it provides dispatchEvent and
// addEventListener. However it doesn't have an easy way to reset listeners between
// tests.
//
// The service-worker-mock is added to the jest environment using the comment above.
// The import below is just to get the types.
import "service-worker-mock";

// The types for service-worker-mock do not include everything it can do
// Here are the extra parts we are using.
interface ExtraServiceWorkerMock {
  resetSwEnv: () => void;
  skipWaiting: () => Promise<void>;
}

declare const self: WorkerGlobalScope & ExtraServiceWorkerMock;

describe("Service Worker", () => {
  beforeEach(async () => {
    self.resetSwEnv();
    jest.resetModules();

    // Because of resetModules the service worker will be re-imported on each
    // test. Each import will trigger addEventListener calls.
    // The self.resetSwEnv() is what resets any listeners added in the previous
    // test.
    await import("./service-worker");
  });

  it("should return its version", async () => {
    // TODO: It'd be nice if we could use workbox window here
    // since it has the convent messaging mechanism

    // I'm pretty sure this MessageChannel object is coming from service-worker-mock
    // However I think the types for it are coming from typescript's core types
    const channel = new MessageChannel();
    channel.port1.onmessage = (event: MessageEvent) => {
      expect(event.data).toEqual(__VERSION_INFO__);
    };

    expect.assertions(1);

    // In a real browser posting a message is an asynchronous operation, so to test this
    // we'd need to wrap this in a promise and call resolve() when we recieve the response
    // on channel.port2.  However in this test environment the messaging is synchronous
    // so once the trigger is done, then we know our expectations have finished
    await self.trigger("message", {
      data: { type: "GET_VERSION_INFO"},
      ports: [channel.port2]
    });

  });

  it("should call skipWaiting", async () => {
    self.skipWaiting = jest.fn();

    await self.trigger("message", {
      data: { type: "SKIP_WAITING"}
    });

    expect(self.skipWaiting).toHaveBeenCalledTimes(1);
  });
});
