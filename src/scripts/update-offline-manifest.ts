import fs from "fs";
import path from "path";
import { Activity, OfflineManifest, OfflineManifestActivity } from "../types";
import request from "superagent";
import { getAllUrlsInActivity, removeDuplicateUrls, rewriteModelsResourcesUrl } from "../utilities/activity-utils";
import fetch from "node-fetch";

(global as any).fetch = fetch;

const die = (message: string) => {
  console.error(message);
  process.exit(1);
};

const getManifestPath = () => {
  const filename = process.argv[2];

  if (!filename) {
    die("Usage: npm run update-offline-manifest <offline-manifest-filename>");
  }

  const filenameWithExtension = filename.endsWith(".json") ? filename : `${filename}.json`;
  const manifestPath = path.join(__dirname, "../public/offline-manifests/", filenameWithExtension);

  if (!fs.existsSync(manifestPath)) {
    die(`Cannot find ${manifestPath}`);
  }

  return manifestPath;
};

const loadJSONFile = (filename: string) => {
  try {
    return JSON.parse(fs.readFileSync(filename).toString());
  } catch (e) {
    die(`Cannot parse ${filename} - ${e.toString()}`);
  }
};

const getActivity = async (offlineActivity: OfflineManifestActivity): Promise<Activity | null> => {
  console.log("Processing", offlineActivity.name, "...");
  const url = offlineActivity.contentUrl;
  console.log("  ", url, "...");
  if (/http/.test(url)) {
    try {
      const resp = await request.get(url);
      return JSON.parse(resp.body) as Activity;
    } catch (e) {
      die(`Unable to get ${url} - ${e.toString()}`);
    }
  } else {
    const activityPath = path.join(__dirname, "../public/", url);
    return loadJSONFile(activityPath) as Activity;
  }

  return null;
};

const maybeProxyUrl = (url: string) => /^models-resources\//.test(url) ? `http://activity-player-offline.concord.org/${url}` : url;

const main = async () => {
  const manifestPath = getManifestPath();
  const manifestJSON = loadJSONFile(manifestPath) as OfflineManifest;
  let cacheList: string[] = [];

  await manifestJSON.activities.reduce(async (promise, offlineActivity: OfflineManifestActivity) => {
    await promise;

    const activity = await getActivity(offlineActivity);
    if (activity) {
      const urls = await getAllUrlsInActivity(activity);
      console.log(`    found ${urls.length} urls ...`);
      cacheList.push(...urls);
    }
  }, Promise.resolve());

  cacheList = removeDuplicateUrls(cacheList.map(rewriteModelsResourcesUrl));
  cacheList.sort();

  const oldMissingUrls = manifestJSON.cacheList.filter(url => cacheList.indexOf(url) === -1);
  console.log(`\nFound ${cacheList.length} unique urls in content and ${oldMissingUrls.length} urls in manifest cache list not in activities`);

  console.log("\nTesting all urls...");
  const allUrls = cacheList.concat(oldMissingUrls);

  const badUrls: {url: string, status: number}[] = [];
  await allUrls.reduce(async (promise, url: string) => {
    await promise;

    url = maybeProxyUrl(url);
    console.log("  ", url);
    try {
      await request.head(url);
    } catch (e) {
      if (e.status >= 400) {
        badUrls.push({url, status: e.status});
      }
    }
  }, Promise.resolve());

  if (badUrls.length > 0) {
    console.error(`\nFound ${badUrls.length} bad urls...`);
    for (const badUrl of badUrls) {
      console.log(`${badUrl.status}: ${badUrl.url}`);
    }
  }

};

main();

/*

THINGS THAT COULD BE ADDED:

1. Updating local activity json based on resource url
2. Updating manifest with new cache list or all urls

*/
