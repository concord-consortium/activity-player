import sampleActivities from "./data";
import { Activity } from "./types";

export const getActivityDefinition = (activity: string): Promise<Activity> => {
  return new Promise((resolve, reject) => {
    const urlRegex = /^(https:|http:)\/\/\S+/;
    if (activity.match(urlRegex)) {
      getActivityDefinitionFromLara(activity).then(resolve);
    } else {
      if (sampleActivities[activity]) {
        setTimeout(() => resolve(sampleActivities[activity]), 250);
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
