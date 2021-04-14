// I started using service-worker-mock to unit test the service worker
// https://github.com/zackargyle/service-workers/tree/master/packages/service-worker-mock
// Then I realized that for what we want to test we can just use JSDOM
// Using service-worker-mock could be useful, but I ran into conflicts with JSDOM
// they both setup addEventListener and maintain their own listeners, so
// to test it right with service-worker-mock we'd need to disable jsdom in this
// test.
describe("Service Worker", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("should return its version", async () => {
    // Because of resetModules the service worker will be re-imported on each
    // new test. Each import will trigger addEventListener calls
    // It seems JSDOM doesn't clean up listeners between files, so this could
    // be a problem.
    // https://github.com/facebook/jest/issues/1224
    await import("./service-worker");

    // We are using NodeJs's message channel. It is basically the same as the browser
    // message channel. Its ports need to be closed otherwise node won't exist
    window.MessageChannel = (await import("worker_threads")).MessageChannel as any;

    return new Promise((resolve, reject) => {
      // TODO: It'd be nice if we could use workbox window here
      // since it has the convent messaging mechanism
      const channel = new MessageChannel();
      channel.port1.onmessage = (event: MessageEvent) => {
        expect(event.data).toEqual(__VERSION_INFO__);
        // The port needs to be closed so the node process will exit
        channel.port1.close();
        resolve();
      };

      expect.assertions(1);
      // JSDOM doesn't support ports in its postMessage implementation
      // So we construct the event ourselves and use dispatchEvent to send it.
      // If JSDOM supported it then the call would be something like:
      //   self.postMessage({ type: "GET_VERSION_INFO"}, "*", [channel.port2]);
      self.dispatchEvent(new MessageEvent("message", {
        data: { type: "GET_VERSION_INFO"},
        ports: [channel.port2]
      }));
    });
  });
});
