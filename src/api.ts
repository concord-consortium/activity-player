import sampleActivities from "./data";

export type ActivityDefinition = any;

export const getActivityDefinition = (activity: string, baseUrl?: string | null): Promise<ActivityDefinition> => {
  return new Promise((resolve, reject) => {
    if (!baseUrl) {
      if (sampleActivities[activity]) {
        setTimeout(() => resolve(sampleActivities[activity]), 250);
      } else {
        reject(`No sample activity matches ${activity}. For an authored activity, use "baseUrl=..."`);
      }
    } else {
      const urlRegex = /^(https:|http:)\/\/\S+/;
      if (baseUrl.match(urlRegex)) {
        getActivityDefinitionFromLara(activity, baseUrl).then(resolve);
      } else {
        reject(`${baseUrl} must be a valid url, e.g. baseUrl=https%3A%2F%2Fauthoring.concord.org`);
      }
    }
  });
};

// http://app.lara.docker/activities/5/pages/10/export
const getActivityDefinitionFromLara = (activity: string, baseUrl: string): Promise<ActivityDefinition> => {
  return new Promise((resolve, reject) => {
    const exportUrl = `${baseUrl.replace(/\/$/, "")}/api/v1/activities/${activity}.json`;
    fetch(exportUrl)
    .then(response => {
      if (response.status !== 200) {
        reject(`Errored fetching ${exportUrl}. Status Code: ${response.status}`);
        return;
      }

      response.json().then(function(data) {
        resolve(data);
      });
    })
    .catch(function(err) {
      reject(`Errored fetching ${exportUrl}. ${err}`);
    });
  });
};
