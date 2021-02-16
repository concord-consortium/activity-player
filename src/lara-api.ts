import { sampleActivities, sampleSequences } from "./data";
import { Activity, Sequence } from "./types";
import { runningInCypress } from "./utilities/cypress";

export const getActivityDefinition = (activity: string): Promise<Activity> => {
  return new Promise((resolve, reject) => {
    const urlRegex = /^(https:|http:)\/\/\S+/;
    if (activity.match(urlRegex)) {
      getActivityDefinitionFromLara(activity).then(resolve);
    } else {
      if (sampleActivities[activity]) {
        setTimeout(() => resolve(rewriteModelsResourcesUrls(sampleActivities[activity])), 250);
      } else {
        reject(`No sample activity matches ${activity}`);
      }
    }
  });
};

const walkActivity = (activityNode: any, stringCallback: (s: string) => string) => {
  if (!activityNode) {
    return;
  }
  if (activityNode instanceof Array) {
    for (const i in activityNode) {
      walkActivity(activityNode[i], stringCallback);
    }
  } else if (typeof activityNode === "object" ) {
    Object.keys(activityNode).forEach(key => {
      switch (typeof activityNode[key]) {
        case "string":
          activityNode[key] = stringCallback(activityNode[key]);
          break;
        case "object":
          walkActivity(activityNode[key], stringCallback);
          break;
      }
    });
  } else if (typeof activityNode === "string") {
    activityNode = stringCallback(activityNode);
  }
};

const rewriteModelsResourcesUrls = (activity: Activity) => {
  // do not rewrite urls when running in Cypress, otherwise the sample activity iframes do not load causing timeouts
  if (runningInCypress) {
    return activity;
  }

  walkActivity(activity, (s) => {
    return s
      .replace(/https?:\/\/models-resources\.concord\.org/, "models-resources")
      .replace(/https?:\/\/models-resources\.s3\.amazonaws\.com/, "models-resources")
      .replace(/https?:\/\/((.+)-plugin)\.concord\.org/, "models-resources/$1");

  });
  return activity;
};

export const getAllUrlsInActivity = (activity: Activity, urls: string[] = []) => {
  walkActivity(activity, (s) => {
    if (/^(\s*https?:\/\/|models-resources)/.test(s)) {
      urls.push(s);
    }
    return s;
  });
  return urls;
};

const getActivityDefinitionFromLara = (activityUrl: string): Promise<Activity> => {
  return new Promise((resolve, reject) => {
    fetch(activityUrl)
    .then(response => {
      if (response.status !== 200) {
        reject(`Errored fetching ${activityUrl}. Status Code: ${response.status}`);
        return;
      }

      response.json().then(function(data) {
        resolve(rewriteModelsResourcesUrls(data));
      });
    })
    .catch(function(err) {
      reject(`Errored fetching ${activityUrl}. ${err}`);
    });
  });
};

export const getSequenceDefinition = (sequence: string): Promise<Sequence> => {
  return new Promise((resolve, reject) => {
    const urlRegex = /^(https:|http:)\/\/\S+/;
    if (sequence.match(urlRegex)) {
      getSequenceDefinitionFromLara(sequence).then(resolve);
    } else {
      if (sampleSequences[sequence]) {
        setTimeout(() => resolve(sampleSequences[sequence]), 250);
      } else {
        reject(`No sample sequence matches ${sequence}`);
      }
    }
  });
};

const getSequenceDefinitionFromLara = (sequenceUrl: string): Promise<Sequence> => {
  return new Promise((resolve, reject) => {
    fetch(sequenceUrl)
    .then(response => {
      if (response.status !== 200) {
        reject(`Errored fetching ${sequenceUrl}. Status Code: ${response.status}`);
        return;
      }

      response.json().then(function(data) {
        resolve(data);
      });
    })
    .catch(function(err) {
      reject(`Errored fetching ${sequenceUrl}. ${err}`);
    });
  });
};
