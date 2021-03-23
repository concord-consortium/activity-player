declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { StaleWhileRevalidate } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { RangeRequestsPlugin } from "workbox-range-requests";

const ignoredGets: RegExp[] = [
  /\/sockjs-node\/info/,             // webpack-dev-server
  /\.hot-update\./,                  // webpack-dev-server
  /\/firestore\.googleapis\.com\//,  // firebase
];

// InjectManifest will add in the precache manifest here:
const precacheEntries = [
    // Add URLs that are referenced directly in index.html
    {url: "https://code.jquery.com/ui/1.12.1/themes/base/jquery-ui.css", revision: null},
    {url: "https://fonts.googleapis.com/css2?family=Lato:wght@400;700;900&display=swap", revision: null},
  ].concat((self as any).__WB_MANIFEST);

precacheAndRoute(precacheEntries, {
  // Ignore most URL parameters. We want to ignore the runKey on index.html
  // as well as other paramters on index.html
  // The exception are the params needed by the lato request above
  // This approach of not ignoring family and dispaly is hacking.
  // It'd be better if we just ignored all params on index.html and let other
  // params go through. We are about to change this precaching code, so it
  // it doesn't seem worth the effort to find a better way
  ignoreURLParametersMatching: [/(?!(family|display))/]
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
        statuses: [0, 200],
      }),
      // handle range requests
      new RangeRequestsPlugin(),
    ],
  }),
);

addEventListener("message", (event) => {
  if (event.data) {
    switch (event.data.type) {
      case "SKIP_WAITING":
        console.log("Calling skipWaiting() from service worker...");
        self.skipWaiting();
        break;
    }
  }
});

console.log("hello from the compiled service-worker!!!!!");
