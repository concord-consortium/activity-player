declare const self: ServiceWorkerGlobalScope;

import {precacheAndRoute} from "workbox-precaching";

// InjectManifest will add in the precache manifest here:
precacheAndRoute((self as any).__WB_MANIFEST, {
  // Ignore all URL parameters (such as runKey on index.html)
  ignoreURLParametersMatching: [/.*/]
});

addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("Calling skipWaiting() from service worker...");
    self.skipWaiting();
  }
});

console.log("hello from the compiled service-worker!!!!!");
