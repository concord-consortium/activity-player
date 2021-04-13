import { dexieStorage } from "./storage/dexie-storage";
import { OfflineActivity, OfflineManifest, OfflineManifestActivity,
  OfflineManifestCacheList } from "./types";
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
  workbox: Workbox;
  offlineManifest: OfflineManifest;
  onCachingStarted: (entries: OfflineManifestCacheList) => void;
  onUrlCached: (url: string) => void;
  onUrlCacheFailed: (url: string, err: any) => void;
  onCachingFinished: () => void;
}

export interface CacheUrlsOptions {
  workbox: Workbox;
  entries: OfflineManifestCacheList;
  onCachingStarted: (entries: OfflineManifestCacheList) => void;
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
export const cacheUrlsWithProgress = (options: CacheUrlsOptions): Promise<void> => {
  const {workbox, entries, onCachingStarted, onUrlCached, onUrlCacheFailed, onCachingFinished} = options;

  // workbox.getSW() is a little fuzzy here. As long as it is called after we have
  // a version match, then it should correctly resolve to the active or newly installed
  // service worker. However that is only the case if the updated service worker triggered
  // an update event within 60 seconds of when we called workbox.register.
  return workbox.getSW()
  .then(sw => new Promise( (resolve, reject ) => {
    onCachingStarted(entries);

    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event: MessageEvent) => {
      // Handle the various messages from the channel
      if (event.data?.type === "ENTRY_CACHED") {
        console.log("ENTRY_CACHED", event.data.payload);
        onUrlCached(event.data.payload?.url);
      } else if (event.data?.type === "ENTRY_FOUND") {
        console.log("ENTRY_FOUND", event.data.payload);
        onUrlCached(event.data.payload?.url);
      } else if (event.data?.type === "ENTRY_CACHE_FAILED") {
        console.error("ENTRY_CACHE_FAILED", event.data.payload);
        onUrlCacheFailed(event.data.payload?.url, event.data.payload?.error);
      } else if (event.data?.type === "CACHING_FINISHED") {
        console.log("CACHING_FINISHED");
        onCachingFinished();
        resolve();
      }
    };

    sw.postMessage({type: "CACHE_ENTRIES_WITH_PROGRESS", payload: {entriesToCache: entries}},
      [messageChannel.port2]);
  }));

};

export const cacheOfflineManifest = (options: CacheOfflineManifestOptions) => {
  const {workbox, offlineManifest, onCachingStarted, onUrlCached, onUrlCacheFailed, onCachingFinished} = options;
  const activityUrls = offlineManifest.activities.map(a => a.contentUrl) as OfflineManifestCacheList;
  const entries: OfflineManifestCacheList = activityUrls.concat(offlineManifest.cacheList);
  const cacheUrlsOptions = {workbox, entries, onCachingStarted, onUrlCached, onUrlCacheFailed, onCachingFinished};
  return cacheUrlsWithProgress(cacheUrlsOptions);
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
      // NOTE: the type is hacked here since this isn't used and likely to be removed
      // https://github.com/concord-consortium/activity-player/pull/237
      cacheList.push(url as any);
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
