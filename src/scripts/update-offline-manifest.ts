import fs from "fs";
import path from "path";
import { Activity, OfflineManifest, OfflineManifestActivity } from "../types";
import request from "superagent";
import { getAllUrlsInActivity, removeDuplicateUrls, rewriteProxiableIframeUrls,
  walkObject } from "../utilities/activity-utils";
import fetch from "node-fetch";
import { config } from "./update-offline-manifest.config";

interface OutputInfo {
  outputManifestPath: string;
  outputActivityDir: string;
  createOutputDir: boolean;
  sourceVersionName: string;
  outputVersionName: string;
}

// pretend to be chrome, this helps with google fonts
// might be a problem if we want to support iPad offline
// This approach was taken from here:
// https://github.com/node-fetch/node-fetch/issues/591#issuecomment-474457866
(global as any).fetch = (url:any , args:any = {}) => {
  args.headers = args.headers || {};
  args.headers["user-agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36";
  return fetch(url, args);
};

let bumpVersion = false;
let fetchActivities = true;

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
  fetchActivities = !(options.indexOf("--no-fetch-activities") !== -1);

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

  if (fetchActivities) {
    try {
      const resp = await request.get(url);
      return JSON.parse(resp.text) as Activity;
    } catch (e) {
      die(`Unable to get ${url} - ${e.toString()}`);
    }
  } else {
    const activityPath = path.join(__dirname, "../public/", offlineActivity.contentUrl);
    return loadJSONFile(activityPath) as Activity;
  }

  return null;
};

const maybeProxyUrl = (url: string) => /^models-resources\//.test(url) ? `http://activity-player-offline.concord.org/${url}` : url;

const getOutputInfo = (manifestPath: string, bumpVersion: boolean): OutputInfo => {
  const {dir, base} = path.parse(manifestPath);

  const matches = base.match(/^(.*)-v(\d+)\.json$/);
  if (!matches) {
    return die(`Not a versioned manifest we can deal with: ${manifestPath}`);
  }

  const sourceVersion = parseInt(matches[2], 10);
  if (isNaN(sourceVersion)) {
    return die(`Not a integer version: ${matches[2]}`);
  }
  const sourceVersionName = `${matches[1]}-v${sourceVersion}`;

  const outputVersion = bumpVersion ? sourceVersion + 1 : sourceVersion;

  const outputVersionName = `${matches[1]}-v${outputVersion}`;
  const outputManifestPath = path.join(dir, `${outputVersionName}.json`);
  const offlineActivitiesDir = dir.replace("offline-manifests", "offline-activities");

  let outputActivityDir = offlineActivitiesDir;
  let createOutputDir = false;

  // Some manifests use directories for their activities files
  try {
    const possibleSourceActivityDir = path.join(offlineActivitiesDir, sourceVersionName);
    const sourceVersionStat = fs.statSync(possibleSourceActivityDir);
    if (sourceVersionStat.isDirectory()) {
      outputActivityDir = path.join(outputActivityDir, outputVersionName);
      createOutputDir = true;
    }
  } catch (e) {} // eslint-disable-line no-empty

  return ({
    outputManifestPath,
    outputActivityDir,
    createOutputDir,
    sourceVersionName,
    outputVersionName
  });
};

const saveActivity = (outputInfo: OutputInfo, offlineActivity: OfflineManifestActivity, activity: Activity) => {
  let {base} = path.parse(offlineActivity.contentUrl);
  if (!outputInfo.createOutputDir) {
    base = base.replace(outputInfo.sourceVersionName, outputInfo.outputVersionName);
  }
  const filename = path.join(outputInfo.outputActivityDir, base);
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
      plugin.approved_script.json_url = config.glossary.manifestUrl;
    }
    return plugin;
  });

  walkObject(activity, (s, key) => {
    if (key === "base_url") {
      const matches = s.match(/^.*\/question-interactives\/(version|branch)\/([^/]+)(\/(.*))$/);
      if (matches) {
        return `https://models-resources.concord.org/question-interactives/version/${config.questionInteractives.version}${matches[3]}`;
      }
    }
    return s;
  });
};

const removeTeacherEdition = (activity: Activity) => {
  activity.pages.forEach(page => {
    page.embeddables = page.embeddables.filter(embeddableWrapper => {
      const embeddable = embeddableWrapper.embeddable;
      return !(embeddable.type === "Embeddable::EmbeddablePlugin" &&
               embeddable.plugin?.approved_script_label === "teacherEditionTips");
    });
  });
};

const saveUpdatedManifest = (outputInfo: OutputInfo, bumpVersion: boolean,
  sourceManifest: OfflineManifest, cacheList: string[]) => {

  let activities = sourceManifest.activities;
  if (bumpVersion) {
    activities = sourceManifest.activities.map(a => ({...a, contentUrl: a.contentUrl.replace(outputInfo.sourceVersionName, outputInfo.outputVersionName)}));
  }
  const newOfflineManifest: OfflineManifest = {
    name: sourceManifest.name,
    activities,
    cacheList
  };
  console.log(`   saving ${outputInfo.outputManifestPath}...`);
  fs.writeFileSync(outputInfo.outputManifestPath, JSON.stringify(newOfflineManifest, null, 2));
};

const main = async () => {
  const manifestPath = getManifestPath();
  const manifestJSON = loadJSONFile(manifestPath) as OfflineManifest;
  let cacheList: string[] = [];

  const outputInfo = getOutputInfo(manifestPath, bumpVersion);
  if (outputInfo?.createOutputDir) {
    try {
      fs.mkdirSync(outputInfo.outputActivityDir);
    } catch (e) {} // eslint-disable-line no-empty
  }

  for (const offlineActivity of manifestJSON.activities) {
    const activity = await getActivity(offlineActivity);
    if (activity) {
      // update glossary urls and question interactives in activity
      updateActivityUrls(activity);

      removeTeacherEdition(activity);

      saveActivity(outputInfo, offlineActivity, activity);

      // Replace the iframe urls with models-resources when we can
      // But do this after we save the activity since the same thing is going
      // to be applied at runtime
      // Perhaps we want to change this behavior to simplify the runtime.
      // Also it would be useful if this function told us about iframe urls
      // that can't be re-written because these will likely fail when offline
      rewriteProxiableIframeUrls(activity);

      const urls = await getAllUrlsInActivity(activity);
      console.log(`    found ${urls.length} urls ...`);
      cacheList.push(...urls);
    }
  }

  cacheList = removeDuplicateUrls(cacheList);
  cacheList.sort();

  // const oldMissingUrls = manifestJSON.cacheList.filter(url => cacheList.indexOf(url) === -1);
  // const allUrls = cacheList.concat(oldMissingUrls);
  // console.log(`\nFound ${cacheList.length} unique urls in content and ${oldMissingUrls.length} urls in manifest cache list not in activities`);
  console.log(`\nFound ${cacheList.length} unique urls in content`);

  saveUpdatedManifest(outputInfo, bumpVersion, manifestJSON, cacheList);

  console.log("\nTesting all urls...");

  const badUrls: {url: string, status: number}[] = [];
  for (let url of cacheList) {
    url = maybeProxyUrl(url);
    console.log("  ", url);
    try {
      await request.head(url);
    } catch (e) {
      if (e.status >= 400) {
        badUrls.push({url, status: e.status});
      }
    }
  }

  if (badUrls.length > 0) {
    console.error(`\nFound ${badUrls.length} bad urls...`);
    for (const badUrl of badUrls) {
      console.log(`${badUrl.status}: ${badUrl.url}`);
    }
  }

};

main();
