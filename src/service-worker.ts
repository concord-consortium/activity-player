declare const self: ServiceWorkerGlobalScope;

const versionInfo = "__SERVICE_WORKER_VERSION_INFO__";  // replaced by webpack using string-replace-loader

import { WorkboxPlugin } from "workbox-core";
import { registerRoute } from "workbox-routing";
import { CacheOnly, NetworkFirst } from "workbox-strategies";
// import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { RangeRequestsPlugin } from "workbox-range-requests";

const ignoredGets: RegExp[] = [
  /\/sockjs-node\/info/,             // webpack-dev-server
  /\.hot-update\./,                  // webpack-dev-server
  /\/firestore\.googleapis\.com\//,  // firebase
  /\/install\.html/,                 // installer
  /\/assets\/install\.*/,            // installer
  /\/app-manifest\.js/,              // installer
];

// FIXME: we need to ignore some URL parameters but not others and it is
// different for different cases.
// When installing files we are adding a __WB_REVISION__ param
// but when searchig for files that won't be included.
// The index.html will have an activity and contentUrl param when a link is clicked
// on.
// The revision params are useful to so futures installs force updates
// to files. So it prevents incorrect caching. This is only needed during the
// install. If we saved these parameters in the actual cache then we'd need to
// re-add these revisions for each matching request so it would be found in the cache
// If we don't store them in the cache, then we'll have to maintain them outside
// of the cache which seems error prone. However to put them in the cache we have
// to maintain outside anyhow so we can add them to each request. So it seems
// like we have to use them.
// In our current application manifest, the only two places they are needed is on the
// index.html and manifest.json files.
// In our content manifests they are needed pretty much everywhere.

// Cache all get requests
// We will need something like this for authoring
// registerRoute(
//   ({ request }) => {
//     const isGet = request.method.toUpperCase() === "GET";
//     const isIgnored = !!ignoredGets.find(ig => ig.test(request.url));
//     const isCachable = isGet && !isIgnored;
//     if (isCachable) {
//       self.clients.matchAll({type: "window"}).then(clients => {
//         for (const client of clients) {
//           client.postMessage({type: "GET_REQUEST", url: request.url});
//         }
//       });
//     }
//     return isCachable;
//   },
//   new StaleWhileRevalidate({
//     cacheName: "cachedGets",
//     plugins: [
//       // Ensure that only requests that result in a 200 status are cached
//       new CacheableResponsePlugin({
//         statuses: [0, 200],
//       }),
//       // handle range requests
//       new RangeRequestsPlugin(),
//     ],
//   }),
// );

/**
   Strip out the __WB_REVISION__ parameter
   Note this also escapes the parameters, so it needs to be applied to both the
   write and read operations
   For example URLs like this one:
     https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap
   get converted to this format when passing through:
     https://fonts.googleapis.com/css2?family=Lato%3Awght%40400%3B700%3B900&display=swap
**/
const stripWbRevision: WorkboxPlugin = {
  cacheKeyWillBeUsed: async ({request, mode, params, event, state}) => {
    const url = new URL(request.url);
    url.searchParams.delete("__WB_REVISION__");
    return url.href;
  }
};

registerRoute(
  ({ request }) => {
    const isGet = request.method.toUpperCase() === "GET";
    // TODO: Maybe we want to block firestore requests when not launched from the portal
    // but those should only happen if the application code is buggy
    const isIgnored = !!ignoredGets.find(ig => ig.test(request.url));
    return isGet && !isIgnored;
  },
  new CacheOnly({
    cacheName: "cachedGets",
    plugins: [
      // handle range requests
      new RangeRequestsPlugin(),
      // We don't really need to delete the __WB_REVISION__ here
      // but otherwise the cache key will not match the key used during the install
      stripWbRevision
    ],
  }),
);


// These were taken from workbox-routing/Router
// they will likely need to be changed so we can include revisions
// which can force updates from what is cached.
type RequestArgs = string | [string, RequestInit?];
interface CacheURLsMessageData {
  type: string;
  payload: {
    urlsToCache: RequestArgs[];
  };
}

// This was taken from workbox-routing/Router

/**
 * Adds a message event listener for URLs to cache from the window.
 * This is useful to cache resources loaded on the page prior to when the
 * service worker started controlling it.
 *
 * The format of the message data sent from the window should be as follows.
 * Where the `urlsToCache` array may consist of URL strings or an array of
 * URL string + `requestInit` object (the same as you'd pass to `fetch()`).
 *
 * ```
 * {
 *   type: 'CACHE_URLS',
 *   payload: {
 *     urlsToCache: [
 *       './script1.js',
 *       './script2.js',
 *       ['./script3.js', {mode: 'no-cors'}],
 *     ],
 *   },
 * }
 * ```
 */
function addCacheListener() {
  const networkFirst = new NetworkFirst({
    cacheName: "cachedGets",
    plugins: [
      stripWbRevision
    ]
  });

  // See https://github.com/Microsoft/TypeScript/issues/28357#issuecomment-436484705
  self.addEventListener("message", ((event: ExtendableMessageEvent) => {
    if (event.data && event.data.type === "CACHE_URLS_WITH_PROGRESS") {
      const {payload}: CacheURLsMessageData = event.data;

      console.log(`Caching URLs from the window`, payload.urlsToCache);

      const requestPromises = Promise.all(payload.urlsToCache.map(
          (entry: string | [string, RequestInit?]) => {
        if (typeof entry === "string") {
          entry = [entry];
        }

        const request = new Request(...entry);
        // Use a specific stragegy that is not registered as a route
        // this way we get WorkBoxes features of stragegies without adding this
        // network stragegy as a way that handles fetch events so regular
        // page requests won't trigger network requests
        return networkFirst.handle({request, event});

      // TODO(philipwalton): TypeScript errors without this typecast for
      // some reason (probably a bug). The real type here should work but
      // doesn't: `Array<Promise<Response> | undefined>`.
      }) as any[]); // TypeScript

      event.waitUntil(requestPromises);

      // TODO: update this so it sends back status as each request is made
      // If a MessageChannel was used, reply to the message on success.
      if (event.ports?.[0]) {
        requestPromises.then(() => event.ports[0].postMessage(true));
      }
    }
  }) as EventListener);
}

addCacheListener();

addEventListener("message", (event) => {
  if (event.data) {
    switch (event.data.type) {
      case "SKIP_WAITING":
        console.log("Calling skipWaiting() from service worker...");
        self.skipWaiting();
        break;

      case "GET_VERSION_INFO":
        console.log("Got version info request");
        event.ports[0].postMessage(versionInfo);
        break;
    }
  }
});

console.log("hello from the compiled service-worker!!!!!");
