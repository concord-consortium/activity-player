import { LaunchList, LaunchListActivity } from "./types";

export interface LaunchListAuthoringData {
  activities: LaunchListActivity[];
  cacheList: string[]
}

export const getLaunchListUrl = (launchListId: string): string => {
  if (/^\s*https?:\/\//.test(launchListId)) {
    return launchListId;
  }
  return `launch-lists/${launchListId}.json`;
};

export const getLaunchList = (launchListId: string): Promise<LaunchList> => {
  return new Promise((resolve, reject) => {
    const launchListUrl = getLaunchListUrl(launchListId);
    fetch(launchListUrl)
    .then(response => {
      if (response.status !== 200) {
        reject(`Errored fetching ${launchListUrl}. Status Code: ${response.status}`);
        return;
      }
      response.json().then(function(data) {
        resolve(data);
      });
    })
    .catch(function(err) {
      reject(`Errored fetching ${launchListUrl}. ${err}`);
    });
  });
};

export interface cacheLaunchListOptions {
  launchList: LaunchList;
  onCachingStarted: (urls: string[]) => void;
  onUrlCached: (url: string) => void;
  onUrlCacheFailed: (url: string, err: any) => void;
  onAllUrlsCached: () => void;
  onAllUrlsCacheFailed: (errs: any) => void;
}

export const cacheLaunchList = (options: cacheLaunchListOptions) => {
  const {launchList, onCachingStarted, onUrlCached, onUrlCacheFailed, onAllUrlsCached, onAllUrlsCacheFailed} = options;
  const urls = launchList.activities.map(a => a.url).concat(launchList.cacheList);
  const loadingPromises = urls.map(url => {
    return fetch(url)
      .then(() => onUrlCached(url))
      .catch(err => onUrlCacheFailed(url, err));
  });
  onCachingStarted(urls);
  return Promise.all(loadingPromises)
    .then(() => onAllUrlsCached())
    .catch(err => onAllUrlsCacheFailed(err));
};

export const LaunchListAuthoringIdKey = "launchListAuthoringId";
export const LaunchListAuthoringDataKeyPrefix = "launchListAuthoringData:";

export const setLaunchListAuthoringId = (value: string | undefined) => {
  if (value !== undefined) {
    window.localStorage.setItem(LaunchListAuthoringIdKey, value);
  }
};

export const clearLaunchListAuthoringId = () => {
  window.localStorage.removeItem(LaunchListAuthoringIdKey);
};

export const getLaunchListAuthoringId = (): string|undefined => {
  return window.localStorage.getItem(LaunchListAuthoringIdKey) || undefined;
};

export const getLaunchListAuthoringData = (authoringId: string): LaunchListAuthoringData => {
  try {
    const key = `${LaunchListAuthoringDataKeyPrefix}:${authoringId}`;
    return JSON.parse(window.localStorage.getItem(key) || "fail");
  } catch (e) {
    return ({
      activities: [],
      cacheList: []
    });
  }
};

export const setLaunchListAuthoringData = (authoringId: string, data: LaunchListAuthoringData) => {
  const key = `${LaunchListAuthoringDataKeyPrefix}:${authoringId}`;
  window.localStorage.setItem(key, JSON.stringify(data));
};

export const clearLaunchListAuthoringData = (authoringId: string) => {
  const key = `${LaunchListAuthoringDataKeyPrefix}:${authoringId}`;
  window.localStorage.removeItem(key);
};

export const getLaunchListAuthoringDownloadJSON = (name: string, data: LaunchListAuthoringData): LaunchList => {
  const {activities, cacheList} = data;
  return { name, activities, cacheList };
};

export const mergeLaunchListWithAuthoringData = (launchList: LaunchList, authoringData: LaunchListAuthoringData) => {
  const {activities, cacheList} = authoringData;
  launchList.activities.forEach(activity => {
    if (!activities.find(a => a.url === activity.url)) {
      activities.push(activity);
    }
  });
  launchList.cacheList.forEach(url => {
    if (!cacheList.find(item => item === url)) {
      cacheList.push(url);
    }
  });
  return {activities, cacheList};
};
