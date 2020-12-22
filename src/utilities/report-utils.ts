import { queryValue } from "../utilities/url-query";

// TODO: switch default to production report version before production deploy
const kDefaultPortalReportURL = "https://portal-report.concord.org/branch/master/";

export const showReport = () => {
  const reportLink = (queryValue("portal-report") as string) || kDefaultPortalReportURL;
  const runKey= queryValue("runKey");
  const activity = queryValue("activity");
  const activityUrl = activity? ((activity.split(".json"))[0]).replace("api/v1/","") : "";
  const answerSource = window.location.hostname;
  window.open(reportLink + "?runKey=" + runKey + "&activity=" + activityUrl + "&answerSource="+answerSource);
};
