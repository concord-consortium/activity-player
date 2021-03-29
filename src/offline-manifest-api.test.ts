import fetch from "jest-fetch-mock";

import { cacheOfflineManifest, clearOfflineManifestAuthoringData, clearOfflineManifestAuthoringId, getOfflineManifest, getOfflineManifestAuthoringData, getOfflineManifestAuthoringDownloadJSON, getOfflineManifestAuthoringId, getOfflineManifestUrl, mergeOfflineManifestWithAuthoringData, normalizeAndSortOfflineActivities, OfflineManifestAuthoringData, OfflineManifestAuthoringDataKeyPrefix, OfflineManifestAuthoringIdKey, setOfflineManifestAuthoringData, setOfflineManifestAuthoringId } from "./offline-manifest-api";
import { OfflineManifest } from "./types";

(window as any).fetch = fetch;

describe("offline manifest api", () => {

  it("handles #getOfflineManifestUrl", () => {
    expect(getOfflineManifestUrl("foo")).toBe("offline-manifests/foo.json");
    expect(getOfflineManifestUrl("https://foo")).toBe("https://foo");
  });

  it("handles #getOfflineManifest", (done) => {
    const testManifest: OfflineManifest = {
      name: "Test Manifest",
      activities: [],
      cacheList: []
    };
    fetch.mockResponse(JSON.stringify(testManifest));
    const resp = getOfflineManifest("test");
    expect(fetch.mock.calls[0][0]).toEqual("offline-manifests/test.json");
    expect(resp).toBeInstanceOf(Promise);
    resp!.then(data => {
      expect(data).toEqual(testManifest);
      done();
    });
  });

  it.todo("handles #cacheOfflineManifest", (done) => {
    const testManifest: OfflineManifest = {
      name: "Test Manifest",
      activities: [
        {
          name: "Activity 1",
          resourceUrl: "http://example.com/activity-1-resource-url",
          contentUrl: "http://example.com/activity-1-content-url"
        },
        {
          name: "Activity 2",
          resourceUrl: "http://example.com/activity-2-resource-url",
          contentUrl: "http://example.com/activity-2-content-url"
        }
      ],
      cacheList: [
        "http://example.com/cache-list-item-1",
        "http://example.com/cache-list-item-2"
      ]
    };
    const onCachingStarted = jest.fn();
    const onUrlCached = jest.fn();
    const onUrlCacheFailed = jest.fn();
    const onCachingFinished = jest.fn();
    // const resp = cacheOfflineManifest({
    //   offlineManifest: testManifest,
    //   onCachingStarted,
    //   onUrlCached,
    //   onCachingFinished,
    //   onUrlCacheFailed
    // });
    // expect(resp).toBeInstanceOf(Promise);
    // resp!.then(() => {
    //   expect(onCachingStarted).toHaveBeenCalledWith([
    //     "http://example.com/activity-1-content-url",
    //     "http://example.com/activity-2-content-url",
    //     "http://example.com/cache-list-item-1",
    //     "http://example.com/cache-list-item-2"
    //   ]);
    //   expect(onUrlCached).toHaveBeenCalledTimes(4);
    //   expect(onCachingFinished).toHaveBeenCalledTimes(1);
    //   expect(onUrlCacheFailed).not.toHaveBeenCalled();
    //   done();
    // });
  });

  it("handles #setOfflineManifestAuthoringId", () => {
    jest.spyOn(window.localStorage.__proto__, "setItem");
    setOfflineManifestAuthoringId(undefined);
    expect(window.localStorage.setItem).not.toHaveBeenCalled();
    setOfflineManifestAuthoringId("test");
    expect(window.localStorage.setItem).toHaveBeenCalledWith(OfflineManifestAuthoringIdKey, "test");
  });

  it("handles #clearOfflineManifestAuthoringId", () => {
    jest.spyOn(window.localStorage.__proto__, "removeItem");
    clearOfflineManifestAuthoringId();
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(OfflineManifestAuthoringIdKey);
  });

  it("handles #getOfflineManifestAuthoringId", () => {
    jest.spyOn(window.localStorage.__proto__, "getItem");
    getOfflineManifestAuthoringId();
    expect(window.localStorage.getItem).toHaveBeenCalledWith(OfflineManifestAuthoringIdKey);
  });

  it("handles #getOfflineManifestAuthoringData", () => {
    jest.spyOn(window.localStorage.__proto__, "getItem");
    getOfflineManifestAuthoringData("test");
    expect(window.localStorage.getItem).toHaveBeenCalledWith(`${OfflineManifestAuthoringDataKeyPrefix}:test`);
  });

  it("handles #setOfflineManifestAuthoringData", () => {
    const data: OfflineManifestAuthoringData = {activities: [], cacheList: []};
    jest.spyOn(window.localStorage.__proto__, "setItem");
    setOfflineManifestAuthoringData("test", data);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(`${OfflineManifestAuthoringDataKeyPrefix}:test`, JSON.stringify(data));
  });

  it("handles #clearOfflineManifestAuthoringData", () => {
    jest.spyOn(window.localStorage.__proto__, "removeItem");
    clearOfflineManifestAuthoringData("test");
    expect(window.localStorage.removeItem).toHaveBeenCalledWith(`${OfflineManifestAuthoringDataKeyPrefix}:test`);
  });

  it("handles #getOfflineManifestAuthoringDownloadJSON", () => {
    const data: OfflineManifestAuthoringData = {activities: [], cacheList: []};
    expect(getOfflineManifestAuthoringDownloadJSON("test", data)).toEqual({name: "test", activities: [], cacheList: []});
  });

  it("handles #mergeOfflineManifestWithAuthoringData", () => {
    const testManifest: OfflineManifest = {
      name: "Test Manifest",
      activities: [
        {
          name: "Activity 1",
          resourceUrl: "http://example.com/activity-1-resource-url",
          contentUrl: "http://example.com/activity-1-content-url"
        },
        {
          name: "Activity 2",
          resourceUrl: "http://example.com/activity-2-resource-url",
          contentUrl: "http://example.com/activity-2-content-url"
        }
      ],
      cacheList: [
        "http://example.com/cache-list-item-1",
        "http://example.com/cache-list-item-2"
      ]
    };
    const authoringData: OfflineManifestAuthoringData = {
      activities: [
        {
          name: "Activity 3",
          resourceUrl: "http://example.com/activity-3-resource-url",
          contentUrl: "http://example.com/activity-3-content-url"
        }
      ],
      cacheList: [
        "http://example.com/cache-list-item-3",
        "http://example.com/cache-list-item-4"
      ]
    };
    expect(mergeOfflineManifestWithAuthoringData(testManifest, authoringData)).toEqual({
      activities: [
        {
          name: "Activity 3",
          resourceUrl: "http://example.com/activity-3-resource-url",
          contentUrl: "http://example.com/activity-3-content-url"
        },
        {
          name: "Activity 1",
          resourceUrl: "http://example.com/activity-1-resource-url",
          contentUrl: "http://example.com/activity-1-content-url"
        },
        {
          name: "Activity 2",
          resourceUrl: "http://example.com/activity-2-resource-url",
          contentUrl: "http://example.com/activity-2-content-url"
        },
      ],
      cacheList: [
        "http://example.com/cache-list-item-3",
        "http://example.com/cache-list-item-4",
        "http://example.com/cache-list-item-1",
        "http://example.com/cache-list-item-2",
      ]
    });
  });

  it("handles #saveOfflineManifestToOfflineActivities", () => {
    // TODO: add Dexie stubs, example here: https://stackoverflow.com/a/54134903
    expect(true).toEqual(true);
  });

  it("handles #normalizeAndSortOfflineActivities", () => {
    expect(normalizeAndSortOfflineActivities([
      {name: "Activity 5", resourceUrl: "http://example.com/activity-5-resource-url", contentUrl: "http://example.com/activity-5-context-url", manifestName: "Manifest 3", order: 0},
      {name: "Activity 2", resourceUrl: "http://example.com/activity-2-resource-url", contentUrl: "http://example.com/activity-2-context-url", manifestName: "Manifest 1", order: 1},
      {name: "Activity 4", resourceUrl: "http://example.com/activity-4-resource-url", contentUrl: "http://example.com/activity-4-context-url", manifestName: "Manifest 2", order: 1},
      {name: "Activity 1", resourceUrl: "http://example.com/activity-1-resource-url", contentUrl: "http://example.com/activity-1-context-url", manifestName: "Manifest 1", order: 0},
      {name: "Activity 3", resourceUrl: "http://example.com/activity-3-resource-url", contentUrl: "http://example.com/activity-3-context-url", manifestName: "Manifest 2", order: 0},
    ])).toEqual([
      {name: "Activity 1", resourceUrl: "http://example.com/activity-1-resource-url", contentUrl: "http://example.com/activity-1-context-url", manifestName: "Manifest 1", order: 0},
      {name: "Activity 2", resourceUrl: "http://example.com/activity-2-resource-url", contentUrl: "http://example.com/activity-2-context-url", manifestName: "Manifest 1", order: 1},
      {name: "Activity 3", resourceUrl: "http://example.com/activity-3-resource-url", contentUrl: "http://example.com/activity-3-context-url", manifestName: "Manifest 2", order: 0},
      {name: "Activity 4", resourceUrl: "http://example.com/activity-4-resource-url", contentUrl: "http://example.com/activity-4-context-url", manifestName: "Manifest 2", order: 1},
      {name: "Activity 5", resourceUrl: "http://example.com/activity-5-resource-url", contentUrl: "http://example.com/activity-5-context-url", manifestName: "Manifest 3", order: 0},
    ]);
  });

  it("handles #getOfflineActivities", () => {
    // TODO: add Dexie stubs, example here: https://stackoverflow.com/a/54134903
    expect(true).toEqual(true);
  });
});
