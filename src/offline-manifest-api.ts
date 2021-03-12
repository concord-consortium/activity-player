import { dexieStorage } from "./storage/dexie-storage";
import { OfflineManifest, OfflineManifestActivity } from "./types";

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
  offlineManifest: OfflineManifest;
  onCachingStarted: (urls: string[]) => void;
  onUrlCached: (url: string) => void;
  onUrlCacheFailed: (url: string, err: any) => void;
  onAllUrlsCached: () => void;
  onAllUrlsCacheFailed: (errs: any) => void;
}

export const cacheOfflineManifest = (options: CacheOfflineManifestOptions) => {
  const {offlineManifest, onCachingStarted, onUrlCached, onUrlCacheFailed, onAllUrlsCached, onAllUrlsCacheFailed} = options;
  const urls = offlineManifest.activities.map(a => a.url).concat(offlineManifest.cacheList);
  const loadingPromises = urls.map(url => {
    return fetch(url, {mode: "no-cors"})
      .then(() => onUrlCached(url))
      .catch(err => onUrlCacheFailed(url, err));
  });
  onCachingStarted(urls);
  return Promise.all(loadingPromises)
    .then(() => onAllUrlsCached())
    .catch(err => onAllUrlsCacheFailed(err));
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
    if (!activities.find(a => a.url === activity.url)) {
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
  const promises = offlineManifest.activities.map(async (offlineManifestActivity) => {
    const {name, url} = offlineManifestActivity;
    const offlineActivity = await dexieStorage.offlineActivities.get({url});
    if (offlineActivity) {
      await dexieStorage.offlineActivities.update(url, {name, url});
    } else {
      await dexieStorage.offlineActivities.put({name, url});
    }
  });
  await Promise.all(promises);
};

export const getOfflineActivities = async () => await dexieStorage.offlineActivities.toArray();
