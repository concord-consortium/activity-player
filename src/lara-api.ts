import { convertLegacyResource } from "./convert-old-lara/convert";
import { sampleActivities, sampleSequences } from "./data";
import { Activity, Sequence } from "./types";
import { queryValue } from "./utilities/url-query";

export const getResourceUrl = () => {
  const sequenceUrl = queryValue("sequence");
  const activityUrl = queryValue("activity");

  const resourceUrl = sequenceUrl ? sequenceUrl : activityUrl;
  if (!resourceUrl) {
    return "";
  }

  return resourceUrl.split(".json")[0].replace("api/v1/","");
};

export const getActivityDefinition = (activity: string): Promise<Activity> => {
  return new Promise((resolve, reject) => {
    const urlRegex = /^(https:|http:)\/\/\S+/;
    if (activity.match(urlRegex)) {
      getActivityDefinitionFromLara(activity)
      .then((resource)=>{
        if (resource.version === 1) {
          return convertLegacyResource(resource);
        } else {
          return resource;
        }
      })
      .then(resolve);
    } else {
      if (sampleActivities[activity]) {
        if (sampleActivities[activity].version === 1) {
          const convertedActivityResource = convertLegacyResource(sampleActivities[activity]) as Activity;
          resolve(convertedActivityResource);
        } else {
          resolve(sampleActivities[activity]);
        }
      } else {
        reject(`No sample activity matches ${activity}`);
      }
    }
  });
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
        resolve(data);
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
      getSequenceDefinitionFromLara(sequence)
      .then((resource)=>{
        if (resource.activities[0].version === 1) {
          return convertLegacyResource(resource);
        } else {
          return resource;
        }
      }).then(resolve);
    } else {
      if (sampleSequences[sequence]) {
        if (sampleSequences[sequence].activities[0].version === 1) {
          const convertedSequenceResource = convertLegacyResource(sampleSequences[sequence]) as Sequence;
          setTimeout(() => resolve(convertedSequenceResource), 250);
        } else {
          setTimeout(() => resolve(sampleSequences[sequence]), 250);
        }
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
