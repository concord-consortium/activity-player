declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { consoleLog } from "./utilities/console-wrappers";

const ignoredGets: RegExp[] = [
  /\/sockjs-node\/info/,             // webpack-dev-server
  /\.hot-update\./,                  // webpack-dev-server
  /\/firestore\.googleapis\.com\//,  // firebase
];

// InjectManifest will add in the precache manifest here:
precacheAndRoute((self as any).__WB_MANIFEST, {
  // Ignore all URL parameters (such as runKey on index.html)
  ignoreURLParametersMatching: [/.*/]
});

// Cache all get requests
registerRoute(
  ({ request }) => {
    const isGet = request.method.toUpperCase() === "GET";
    const isIgnored = !!ignoredGets.find(ig => ig.test(request.url));
    const isCachable = isGet && !isIgnored;
    if (isCachable) {
      self.clients.matchAll({type: "window"}).then(clients => {
        for (const client of clients) {
          client.postMessage({type: "GET_REQUEST", url: request.url});
        }
      });
    }
    return isCachable;
  },
  new StaleWhileRevalidate({
    cacheName: "cachedGets",
    plugins: [
      // Ensure that only requests that result in a 200 status are cached
      new CacheableResponsePlugin({
        statuses: [200],
      }),
    ],
  }),
);

addEventListener("message", (event) => {
  if (event.data) {
    switch (event.data.type) {
      case "SKIP_WAITING":
        consoleLog("Calling skipWaiting() from service worker...");
        self.skipWaiting();
        break;
    }
  }
});

consoleLog("hello from the compiled service-worker!!!!!");
