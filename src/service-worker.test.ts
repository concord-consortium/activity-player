/**
 * @jest-environment ./src/test-utils/service-worker-environment.js
 */

// This is using service-worker-mock to unit test the service worker
// https://github.com/zackargyle/service-workers/tree/master/packages/service-worker-mock
// We could get pretty far just using JSDOM because it provides dispatchEvent and
// addEventListener. However it doesn't have an easy way to reset listeners between
// tests.
//
// The service-worker-mock is added to the jest environment using the doc block comment
// at the top of the file.
// The import below is just to get the types.
import "service-worker-mock";

import fetchMock from "jest-fetch-mock";

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
    fetchMock.enableMocks();

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

  it("should cache resources", (done) => {
    fetchMock.mockIf(/.*/, async req => {
      switch (req.url) {
        // TODO: Note how the slash is added automatic I'm not sure why yet...
        case "https://example.com/":
        case "https://example.com/not-found":
          return {
            body: "another response body",
            headers: {
              "Access-Control-Allow-Origin": "*"
            }
          };
        case "https://example.com/found":
          done.fail("Request to https://example.com/found made when it should be in the cache");
          return "response for resource that should be in the cache";
        case "https://example.com/bad":
          throw new Error("Bad Url");
          // TODO: the service worker does not report 404 as errors currently it just seems
          // to silently cache them.
          // return {
          //   status: 404,
          //   body: "Not Found",
          //   headers: {
          //     "Access-Control-Allow-Origin": "*"
          //   }
          // };
        default:
          done.fail(`Unexpected Request for ${req.url}`);
          return "response for resource that was unexpected";
      }
    });

    const channel = new MessageChannel();
    channel.port1.onmessage = (event: MessageEvent) => {
      // This is going to be called multiple times
      // I'm not quite sure how to handle I guess we
      // can manually track the number of calls and
      // assert it later
      // This will likely real asynchronous
      try {
        switch (event.data.type) {
          case "ENTRY_CACHED":
            const url = event.data.payload.url;
            expect(url === "https://example.com/" ||
                   url === "https://example.com/not-found").toBeTruthy();
            break;
          case "ENTRY_FOUND":
            expect(event.data.payload.url).toEqual("https://example.com/found");
            break;
          case "ENTRY_CACHE_FAILED":
            expect(event.data.payload.url).toEqual("https://example.com/bad");
            break;
          case "CACHING_FINISHED":
            done();
            break;
          default:
            done.fail("Recived an un expected message");
          }
      } catch (error) {
        // the expect statements throw errors that we need to hand back up to done
        done(error);
      }
    };

    expect.assertions(4);

    self.caches.open("cachedGets")
    .then(cache => {
      cache.put(new Request("https://example.com/found"),
        new Response("cached response", { headers: {etag: `"matching-revision"`}}));
    })
    .then( () => {
      self.trigger("message", {
        data: {
          type: "CACHE_ENTRIES_WITH_PROGRESS",
          payload: {
            entriesToCache: [
              "https://example.com",
              "https://example.com/bad",
              {
                url: "https://example.com/not-found",
                revision: "12345abcdf"
              },
              {
                url: "https://example.com/found",
                revision: "matching-revision"
              },
            ]
          }
        },
        ports: [channel.port2]
      });
    });
  });
});
