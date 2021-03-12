import { sampleActivities, sampleSequences } from "./data";
import { Activity, Sequence } from "./types";
import { isNotSampleActivityUrl, rewriteModelsResourcesUrls } from "./utilities/activity-utils";
import { queryValue } from "./utilities/url-query";

export const getResourceUrl = (url?: string) => {
  const resourceUrl = url ?? queryValue("sequence") ?? queryValue("activity") ?? "";
  return resourceUrl.split(".json")[0].replace("api/v1/","");
};

export const getActivityDefinition = (activity: string): Promise<Activity> => {
  return new Promise((resolve, reject) => {
    if (isNotSampleActivityUrl(activity)) {
      fetchActivityDefinition(activity).then(resolve);
    } else if (sampleActivities[activity]) {
      setTimeout(() => resolve(rewriteModelsResourcesUrls(sampleActivities[activity])), 250);
    } else {
      reject(`No sample activity matches ${activity}`);
    }
  });
};

const fetchActivityDefinition = (activityUrl: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    return fetch(activityUrl)
      .then(response => {
        if (response.status !== 200) {
          reject(`Errored fetching ${activityUrl}. Status Code: ${response.status}`);
          return;
        }
        response.json()
          .then((data) => resolve(rewriteModelsResourcesUrls(data)))
          .catch(reject);
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
