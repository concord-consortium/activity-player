import sampleActivities from "./data";

export type ActivityDefinition = any;

export const getActivityDefinition = (urlOrName: string): Promise<ActivityDefinition> => {
  return new Promise((resolve, reject) => {
    const urlRegex = /^(https:|http:)\/\/\S+/;
    if (urlOrName.match(urlRegex)) {
      reject("Not supporting urls yet");
    } else if (sampleActivities[urlOrName]) {
      setTimeout(() => resolve(sampleActivities[urlOrName]), 250);
    } else {
      reject("Activity name is neither a url nor matches a sample activity: " + urlOrName);
    }
  });
};
