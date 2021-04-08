import { dexieStorage } from "./storage/dexie-storage";
import { OfflineActivity, OfflineManifest } from "./types";
import { Workbox } from "workbox-window/index";

export const getOfflineManifestUrl = (id: string): string => {
  if (/^\s*https?:\/\//.test(id)) {
    return id;
  }
  return `offline-manifests/${id}.json`;
};

export const getOfflineManifest = (id: string): Promise<OfflineManifest> => {
  return new Promise((resolve, reject) => {
    const url = getOfflineManifestUrl(id);
    fetch(url)
    .then(response => {
      if (response.status !== 200) {
        reject(`Errored fetching ${url}. Status Code: ${response.status}`);
        return;
      }
      response.json().then(function(data) {
        resolve(data);
      });
    })
    .catch(function(err) {
      reject(`Errored fetching ${url}. ${err}`);
    });
  });
};

export interface CacheOfflineManifestOptions {
  workbox: Workbox;
  offlineManifest: OfflineManifest;
  onCachingStarted: (urls: string[]) => void;
  onUrlCached: (url: string) => void;
  onUrlCacheFailed: (url: string, err: any) => void;
  onCachingFinished: () => void;
}

export interface CacheUrlsOptions {
  workbox: Workbox;
  urls: string[];
  onCachingStarted: (urls: string[]) => void;
  onUrlCached: (url: string) => void;
  onUrlCacheFailed: (url: string, err: any) => void;
  onCachingFinished: () => void;
}

/*
  We can't use the built in Workbox CACHE_URLS message because it doesn't provide
  progress messages.
  We can't use the built in Workbox messageSW because it only allows a single
  response on the MessageChannel indicating that it completed.
*/
export const cacheUrlsWithProgress = async (options: CacheUrlsOptions) => {
  const {workbox, urls, onCachingStarted, onUrlCached, onUrlCacheFailed, onCachingFinished} = options;

  onCachingStarted(urls);

  const sw = await workbox.getSW();
  const messageChannel = new MessageChannel();

  messageChannel.port1.onmessage = (event: MessageEvent) => {
    // Handle the various messages from the channel
    if (event.data?.type === "URL_CACHED") {
      console.log("URL_CACHED", event.data.payload);
      onUrlCached(event.data.payload?.url);
    } else if (event.data?.type === "URL_CACHE_FAILED") {
      console.error("URL_CACHE_FAILED", event.data.payload);
      onUrlCacheFailed(event.data.payload?.url, event.data.payload?.error);
    } else if (event.data?.type === "CACHING_FINISHED") {
      console.log("CACHING_FINISHED");
      onCachingFinished();
      // TODO having a promise here that we can resolve could be helpful
    }
  };

  sw.postMessage({type: "CACHE_URLS_WITH_PROGRESS", payload: {urlsToCache: urls}},
    [messageChannel.port2]);

  // We might need to block until complete so the messageChannel doesn't get
  // garbage collected, but it isn't simple to just do an await here
  // so maybe we can get by without blocking.
};

export const cacheOfflineManifest = (options: CacheOfflineManifestOptions) => {
  const {workbox, offlineManifest, onCachingStarted, onUrlCached, onUrlCacheFailed, onCachingFinished} = options;
  const urls = offlineManifest.activities.map(a => a.contentUrl).concat(offlineManifest.cacheList);
  const cacheUrlsOptions = {workbox, urls, onCachingStarted, onUrlCached, onUrlCacheFailed, onCachingFinished};
  return cacheUrlsWithProgress(cacheUrlsOptions);
};

export const saveOfflineManifestToOfflineActivities = async (offlineManifest: OfflineManifest) => {
  const manifestName = offlineManifest.name;
  const promises = offlineManifest.activities.map(async (offlineManifestActivity, order) => {
    const {name, resourceUrl, contentUrl} = offlineManifestActivity;
    const offlineActivity = await dexieStorage.offlineActivities.get({resourceUrl});
    if (offlineActivity) {
      await dexieStorage.offlineActivities.update(resourceUrl, {name, resourceUrl, contentUrl, manifestName, order});
    } else {
      await dexieStorage.offlineActivities.put({name, resourceUrl, contentUrl, manifestName, order});
    }
  });
  await Promise.all(promises);
};

export const normalizeAndSortOfflineActivities = (rawList: OfflineActivity[]) => {
  // ensure older saved offline activities have a defined manifest name and order
  const normalizedList = rawList.map((item, order) => ({...item, manifestName: item.manifestName ?? "", order: item.order ?? order}));
  normalizedList.sort((a, b) => {
    const nameSort = a.manifestName.localeCompare(b.manifestName);
    if (nameSort === 0) {
      return a.order - b.order;
    } else {
      return nameSort;
    }
  });
  return normalizedList;
};

export const getOfflineActivities = async () => {
  const offlineActivities = await dexieStorage.offlineActivities.toArray();
  return normalizeAndSortOfflineActivities(offlineActivities);
};
