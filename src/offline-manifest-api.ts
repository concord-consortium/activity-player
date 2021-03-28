import { dexieStorage } from "./storage/dexie-storage";
import { OfflineActivity, OfflineManifest, OfflineManifestActivity } from "./types";
import { Workbox } from "workbox-window/index";

export interface OfflineManifestAuthoringData {
  activities: OfflineManifestActivity[];
  cacheList: string[]
}

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
  workbox?: Workbox;
  offlineManifest: OfflineManifest;
  onCachingStarted: (urls: string[]) => void;
  onUrlCached: (url: string) => void;
  onUrlCacheFailed: (url: string, err: any) => void;
  onCachingFinished: () => void;
}

/*
We can't use the built in messageSW because we want to receive multiple
messges from the channel.

function messageSW(sw: ServiceWorker, data: {}): Promise<any> {
  return new Promise((resolve) => {
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event: MessageEvent) => {
      resolve(event.data);
    };
    sw.postMessage(data, [messageChannel.port2]);
  });
}
*/
const cacheUrlsWithProgress = async (options: CacheOfflineManifestOptions) => {
  const {workbox, offlineManifest, onCachingStarted, onUrlCached, onUrlCacheFailed, onCachingFinished} = options;
  const urls = offlineManifest.activities.map(a => a.contentUrl).concat(offlineManifest.cacheList);

  if (!workbox) {
    return;
  }

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

  if (workbox) {
    return cacheUrlsWithProgress(options);
  } else {
    const loadingPromises = urls.map(url => {
      return fetch(url, {mode: "cors"})
        .then(() => onUrlCached(url))
        .catch(err => onUrlCacheFailed(url, err));
    });
    onCachingStarted(urls);
    return Promise.allSettled(loadingPromises)
      .then(() => onCachingFinished());
  }
};

export const OfflineManifestAuthoringIdKey = "offlineManifestAuthoringId";
export const OfflineManifestAuthoringDataKeyPrefix = "offlineManifestAuthoringData:";

export const setOfflineManifestAuthoringId = (value: string | undefined) => {
  if (value !== undefined) {
    window.localStorage.setItem(OfflineManifestAuthoringIdKey, value);
  }
};

export const clearOfflineManifestAuthoringId = () => {
  window.localStorage.removeItem(OfflineManifestAuthoringIdKey);
};

export const getOfflineManifestAuthoringId = (): string|undefined => {
  return window.localStorage.getItem(OfflineManifestAuthoringIdKey) || undefined;
};

export const getOfflineManifestAuthoringData = (authoringId: string): OfflineManifestAuthoringData => {
  try {
    const key = `${OfflineManifestAuthoringDataKeyPrefix}:${authoringId}`;
    return JSON.parse(window.localStorage.getItem(key) || "fail");
  } catch (e) {
    return ({
      activities: [],
      cacheList: []
    });
  }
};

export const setOfflineManifestAuthoringData = (authoringId: string, data: OfflineManifestAuthoringData) => {
  const key = `${OfflineManifestAuthoringDataKeyPrefix}:${authoringId}`;
  window.localStorage.setItem(key, JSON.stringify(data));
};

export const clearOfflineManifestAuthoringData = (authoringId: string) => {
  const key = `${OfflineManifestAuthoringDataKeyPrefix}:${authoringId}`;
  window.localStorage.removeItem(key);
};

export const getOfflineManifestAuthoringDownloadJSON = (name: string, data: OfflineManifestAuthoringData): OfflineManifest => {
  const {activities, cacheList} = data;
  return { name, activities, cacheList };
};

export const mergeOfflineManifestWithAuthoringData = (offlineManifest: OfflineManifest, authoringData: OfflineManifestAuthoringData) => {
  const {activities, cacheList} = authoringData;
  offlineManifest.activities.forEach(activity => {
    // Note: if the contentUrl has changed this won't update it in the manifest
    // but in that case it seems reasonable that the author will just manually fix it.
    if (!activities.find(a => a.resourceUrl === activity.resourceUrl)) {
      activities.push(activity);
    }
  });
  offlineManifest.cacheList.forEach(url => {
    if (!cacheList.find(item => item === url)) {
      cacheList.push(url);
    }
  });
  return {activities, cacheList};
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
