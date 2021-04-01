import fs from "fs";
import path from "path";
import { Activity, OfflineManifest, OfflineManifestActivity } from "../types";
import request from "superagent";
import { getAllUrlsInActivity, removeDuplicateUrls, rewriteModelsResourcesUrl, walkObject } from "../utilities/activity-utils";
import fetch from "node-fetch";
import { config } from "./update-offline-manifest.config";

interface BumpInfo {
  newManifestPath: string;
  newActivityDir: string;
  createNewDir: boolean;
  oldVersionName: string;
  newVersionName: string;
}

(global as any).fetch = fetch;

let bumpVersion = false;

const die = (message: string) => {
  console.error(message);
  process.exit(1);
};

const getManifestPath = () => {
  const args = process.argv.slice(2);
  const options = args.filter(arg => /--/.test(arg));
  const nonOptions = args.filter(arg => options.indexOf(arg) === -1);

  const filename = nonOptions[0];
  bumpVersion = options.indexOf("--bump-version") !== -1;

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

const convertToApiUrl = (resourceUrl: string) => {
  const matches = resourceUrl.match(/^(https?:\/\/(.*))\/activities\/(\d+)$/);
  if (!matches) {
    return die(`Unknown resourceUrl format: ${resourceUrl}`);
  }
  return `${matches[1]}/api/v1/activities/${matches[3]}.json`;
};

const getActivity = async (offlineActivity: OfflineManifestActivity): Promise<Activity | null> => {
  console.log("Processing", offlineActivity.name, "...");
  const url = convertToApiUrl(offlineActivity.resourceUrl);
  console.log("  ", url, "...");
  if (/http/.test(url)) {
    try {
      const resp = await request.get(url);
      return JSON.parse(resp.text) as Activity;
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

const getBumpInfo = (manifestPath: string): BumpInfo => {
  const {dir, base} = path.parse(manifestPath);
  const matches = base.match(/^(.*)-v(\d+)\.json$/);
  if (!matches) {
    return die(`Not a versioned manifest we can deal with: ${manifestPath}`);
  }
  const version = parseInt(matches[2], 10);
  if (isNaN(version)) {
    return die(`Not a integer version: ${matches[2]}`);
  }
  const oldVersionName = `${matches[1]}-v${version}`;
  const newVersionName = `${matches[1]}-v${version + 1}`;
  const newManifestPath = path.join(dir, `${newVersionName}.json`);
  let newActivityDir = dir.replace("offline-manifests", "offline-activities");
  const oldActivityDir = path.join(newActivityDir, oldVersionName);

  let createNewDir = false;
  try {
    const oldVersionStat = fs.statSync(oldActivityDir);
    if (oldVersionStat.isDirectory()) {
      newActivityDir = path.join(newActivityDir, newVersionName);
      createNewDir = true;
    }
  } catch (e) {} // eslint-disable-line no-empty

  return ({
    newManifestPath,
    newActivityDir,
    createNewDir,
    oldVersionName,
    newVersionName
  });
};

const saveActivity = (bumpInfo: BumpInfo, offlineActivity: OfflineManifestActivity, activity: Activity) => {
  let {base} = path.parse(offlineActivity.contentUrl);
  if (!bumpInfo.createNewDir) {
    base = base.replace(bumpInfo.oldVersionName, bumpInfo.newVersionName);
  }
  const filename = path.join(bumpInfo.newActivityDir, base);
  console.log(`   saving ${filename}...`);
  fs.writeFileSync(filename, JSON.stringify(activity, null, 2));
};

const updateActivityUrls = (activity: Activity) => {
  activity.plugins = activity.plugins.map(plugin => {
    if (plugin.approved_script_label === "glossary") {
      const authorData = JSON.parse(plugin.author_data);
      authorData.s3Url = config.glossary.s3Url;
      plugin.author_data = JSON.stringify(authorData);
      plugin.approved_script.url = config.glossary.pluginUrl;
    }
    return plugin;
  });

  walkObject(activity, (s, key) => {
    if (key === "base_url") {
      const matches = s.match(/^((.*)question-interactives\/version\/)([^/]+)(\/(.*))$/);
      if (matches) {
        return `${matches[1]}${config.questionInteractives.version}${matches[4]}`;
      }
    }
    return s;
  });
};

const main = async () => {
  const manifestPath = getManifestPath();
  const manifestJSON = loadJSONFile(manifestPath) as OfflineManifest;
  let cacheList: string[] = [];

  const bumpInfo = bumpVersion ? getBumpInfo(manifestPath) : null;
  if (bumpInfo?.createNewDir) {
    try {
      fs.mkdirSync(bumpInfo.newActivityDir);
    } catch (e) {} // eslint-disable-line no-empty
  }

  await manifestJSON.activities.reduce(async (promise, offlineActivity: OfflineManifestActivity) => {
    await promise;

    const activity = await getActivity(offlineActivity);
    if (activity) {
      // update glossary urls and question interactives in activity
      updateActivityUrls(activity);

      if (bumpInfo) {
        saveActivity(bumpInfo, offlineActivity, activity);
      }
      const urls = await getAllUrlsInActivity(activity);
      console.log(`    found ${urls.length} urls ...`);
      cacheList.push(...urls);
    }
  }, Promise.resolve());

  cacheList = removeDuplicateUrls(cacheList.map(rewriteModelsResourcesUrl));
  cacheList.sort();

  // const oldMissingUrls = manifestJSON.cacheList.filter(url => cacheList.indexOf(url) === -1);
  // const allUrls = cacheList.concat(oldMissingUrls);
  // console.log(`\nFound ${cacheList.length} unique urls in content and ${oldMissingUrls.length} urls in manifest cache list not in activities`);
  console.log(`\nFound ${cacheList.length} unique urls in content`);

  if (bumpInfo) {
    // save the cacheList in the new manifest version
    const newOfflineManifest: OfflineManifest = {
      name: manifestJSON.name,
      activities: manifestJSON.activities.map(a => ({...a, contentUrl: a.contentUrl.replace(bumpInfo.oldVersionName, bumpInfo.newVersionName)})),
      cacheList
    };
    console.log(`   saving ${bumpInfo.newManifestPath}...`);
    fs.writeFileSync(bumpInfo.newManifestPath, JSON.stringify(newOfflineManifest, null, 2));
  }

  console.log("\nTesting all urls...");

  const badUrls: {url: string, status: number}[] = [];
  await cacheList.reduce(async (promise, url: string) => {
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

