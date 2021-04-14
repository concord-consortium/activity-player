import "ts-polyfill";

declare const self: ServiceWorkerGlobalScope;

import { WorkboxPlugin } from "workbox-core";
import { registerRoute } from "workbox-routing";
import { CacheOnly, NetworkFirst } from "workbox-strategies";
// import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { RangeRequestsPlugin } from "workbox-range-requests";
import { OfflineManifestCacheList } from "./types";

const ignoredGets: RegExp[] = [
  /\/sockjs-node\/info/,                           // webpack-dev-server
  /\.hot-update\./,                                // webpack-dev-server
  /\/firestore\.googleapis\.com\//,                // firebase
  /\/install\.html/,                               // installer
  /\/assets\/install\.*/,                          // installer
  /\/app-manifest\.js/,                            // installer
  /\/offline-manifests\/.*/,                       // built in manifests
  /https:\/\/learn\.(staging\.)?concord\.org\/.*/  // portal apis when launched from the portal
];

// Disable the noisy workbox dev logs.
// If you are debugging a stragegy issue turning these on can be useful
(self as any).__WB_DISABLE_DEV_LOGS = true;

// TODO we might want to bring this back by adding the __WB_REVISION__ (or our own param)
// onto the requests when installing. Since we have a revision, we might as well use it
// to bust any caches. It would be a odd case that would have things cached wrong because
// the update-offline-manifest script is using the etag from the same cloudfront
// distribution that the CACHE_ENTRIES_WITH_PROGRESS would use. So this cache busting
// would only be useful if the update-offline-manifest got a newer version of the file.
// What might be better is for the CACHE_ENTRIES_WITH_PROGRESS to send a If-Match header
// and also check the resulting response. If the server supports If-Match then I think it
// will return a 412 indicating the resource doesn't match (and it won't send it down).
// If the server doesn't support it, then we can check the etag of the response.
// This approach is safer than cache busting and should acheive the same goal of trying
// to make sure we download an unexpected revision of a resource.
/**
   Strip out the __WB_REVISION__ parameter
   Note this also escapes the parameters, so it needs to be applied to both the
   write and read operations
   For example URLs like this one:
     https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap
   get converted to this format when passing through:
     https://fonts.googleapis.com/css2?family=Lato%3Awght%40400%3B700%3B900&display=swap
**/
// const stripWbRevision: WorkboxPlugin = {
//   cacheKeyWillBeUsed: async ({request, mode, params, event, state}) => {
//     const url = new URL(request.url);
//     url.searchParams.delete("__WB_REVISION__");
//     // We need to create a request with headers because the return value is
//     // passed through to future callbacks. If a simple url is returned then
//     // Workbox makes a generic Request object with no headers.
//     // The headers are important specifically for the Range Plugin which
//     // hooks into the cachedResponseWillBeUsed and looks at the headers of
//     // the response object passed in.
//     return new Request(url.href, {headers: request.headers});
//   }
// };

// If the service worker is loaded at:
// https://example.com/path/service-worker.js
// Then treat
//   https://example.com/path/
//   https://example.com/path/index.html
//   https://example.com/path/index.html?anyParam=hi&anyOtherParam
// All as the same url from the cache they all will have the cache key of
//   https://example.com/path/index.html
const rootUrl = new URL(".", location.href);
const rootIndexHtmlUrl = new URL("index.html", location.href);
const cleanIndexHtmlParams: WorkboxPlugin = {
  cacheKeyWillBeUsed: async ({request, mode, params, event, state}) => {
    const url = new URL(request.url);
    if (url.origin === location.origin &&
        (url.pathname === rootUrl.pathname ||
         url.pathname === rootIndexHtmlUrl.pathname) ) {
      // To be safe we pass the headers through, just like we do when
      // stripping the __WB_REVISION__
      return new Request(rootIndexHtmlUrl.href, {headers: request.headers});
    } else {
      return request;
    }
  }
};

// This is used at runime and during the install to look for existing assets
const cacheOnlyHandler = new CacheOnly({
  cacheName: "cachedGets",
  plugins: [
    // handle range requests
    new RangeRequestsPlugin(),
    cleanIndexHtmlParams
  ],
});

// This is used during the install. The cacheOnlyHandler is checked first to
// see if there is a cached entry with a matching etag.
const networkFirstHandler = new NetworkFirst({
  cacheName: "cachedGets",
  // Skip the disk cache when fetching
  // This fixes a problem where a user visiting an online page with some
  // of the offline assets in it will populate the disk cache with those
  // assets. But they might be stored without CORS headers in the response
  // which then breaks the request made here.
  fetchOptions: {cache: "no-store"},
  plugins: [
    cleanIndexHtmlParams,
    {
      // Don't allow reads from the cache. We only want to populate the cache.
      // If a network request fails we don't want to return the old value
      // from the cache. It might be out of date, and we want the network
      // error to propigate up.
      cachedResponseWillBeUsed: async ({cacheName, request, matchOptions, cachedResponse, event, state}) => {
        return null;
      }
    }
  ]
});


registerRoute(
  ({ request }) => {
    const isGet = request.method.toUpperCase() === "GET";
    // It is tempting to try to block firestore and portal requests here
    // when we aren't launched from the portal.
    // However, those should only happen if the application code is buggy.
    // Additionally there isn't a good way to implement that, there is just
    // one service worker used by all clients: browser tabs and the PWA.
    // So it is possible there will be one 'client' that is launched from the
    // portal and another client that is not. Because of that we can't
    // consitently block these requests.
    const isIgnored = !!ignoredGets.find(ig => ig.test(request.url));
    return isGet && !isIgnored;
  },
  cacheOnlyHandler
);

interface CacheEntriesMessageData {
  type: string;
  payload: {
    entriesToCache: OfflineManifestCacheList;
  };
}

// This approach was based on code in workbox-routing/Router

/**
 * Adds a message event listener for URLs to cache from the window.
 * This is used to install the resources needed by the application.
 *
 * The format of the message data sent from the window should be as follows.
 * Where the `urlsToCache` array may consist of URL strings or an array of
 * URL string + `requestInit` object (the same as you'd pass to `fetch()`).
 *
 * ```
 * {
 *   type: 'CACHE_URLS',
 *   payload: {
 *     entriesToCache: [
 *       './script1.js',
 *       './script2.js',
 *       { url: './script3.js', revision: '1234', size: 456 }
 *     ],
 *   },
 * }
 * ```
 */
function addCacheListener() {
  // See https://github.com/Microsoft/TypeScript/issues/28357#issuecomment-436484705
  self.addEventListener("message", ((event: ExtendableMessageEvent) => {
    if (event.data && event.data.type === "CACHE_ENTRIES_WITH_PROGRESS") {
      const {payload}: CacheEntriesMessageData = event.data;
      const messagePort: MessagePort | undefined = event.ports?.[0];

      console.log(`Caching URLs from the window`, payload.entriesToCache);

      const requestPromises = Promise.allSettled(payload.entriesToCache.map(async (entry) => {
        if (typeof entry === "string") {
          entry = {url: entry};
        }

        const request = new Request(entry.url);

        if (entry.revision) {
          try {
            const response = await cacheOnlyHandler.handle({request, event});
            const etag = response?.headers.get("etag");

            // This will return a quoted string, and possibly a previs of `W/`
            // we don't want to deal with the `W/` etags so we just check for the quotes
            // and then use JSON.parse to remove the quotes
            if (etag?.startsWith(`"`)) {
              const cacheRevision = JSON.parse(etag);
              if (cacheRevision === entry.revision) {
                // We found a matching response in the cache.
                messagePort.postMessage({type: "ENTRY_FOUND", payload: {url: request.url}});
                return;
              }
            }
          } catch (error) {
            // failed to find the response in the cache
          }
        }

        // Use a specific strategy that is not registered as a route
        // this way we get Workbox's strategy features without affecting
        // regular page network requests
        const [responsePromise, donePromise] = networkFirstHandler.handleAll({request, event});

        if (messagePort) {
          try {
            // The response Promise resolves when the browser recieves the headers
            // from the get request.
            // The actual caching of the data can take a while longer as
            // there is a seperate body promise that is used to access that data.
            // The donePromise resolves when this caching is complete.
            await responsePromise;

            // TODO: if we have a revision, we could check the etag of the response to
            // verify we are getting what we expected.
          } catch (error) {
            messagePort.postMessage({type: "ENTRY_CACHE_FAILED", payload: {url: request.url, error}});
            // If we get an error with the request then report the error and bail.
            // We don't want to keep going and possibly report the error twice.
            // Perhaps Workbox does some cleanup after the responsePromise fails so
            // the donePromise is used to make sure that cleanup finishes
            return donePromise;
          }

          try {
            await donePromise;
            messagePort.postMessage({type: "ENTRY_CACHED", payload: {url: request.url}});
          } catch (error) {
            messagePort.postMessage({type: "ENTRY_CACHE_FAILED", payload: {url: request.url, error}});
          }
        }

      // TODO(philipwalton): TypeScript errors without this typecast for
      // some reason (probably a bug). The real type here should work but
      // doesn't: `Array<Promise<Response> | undefined>`.
      }) as any[]); // TypeScript

      // This is needed to keep the service worker alive while it is fetching
      // otherwise the browser can aggresively stop the worker.
      // This might not actually be needed because the event is being passed
      // to the networkFirst handler too, which ought to call waitUntil itself
      event.waitUntil(requestPromises);

      if (messagePort) {
        requestPromises.then(() => {
          // We are using allSettled so if there is an error the caching will
          // continue
          messagePort.postMessage({type: "CACHING_FINISHED"});
        });
      }
    }
  }) as EventListener);
}

addCacheListener();

self.addEventListener("message", (event) => {
  if (event.data) {
    switch (event.data.type) {
      case "SKIP_WAITING":
        self.skipWaiting();
        break;

      case "GET_VERSION_INFO":
        event.ports[0].postMessage(__VERSION_INFO__);
        break;
    }
  }
});

console.log("Service Worker started. version: ", __VERSION_INFO__);
