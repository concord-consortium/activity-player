import { queryValue } from "../utilities/url-query";
import { DEFAULT_PORTAL_REPORT_URL, DEFAULT_PORTAL_REPORT_FIREBASE_APP } from "../components/app";
import { fetchPortalData } from "../portal-api";

const parseUrl = (url: string) => {
  const a = document.createElement("a");
  a.href = url;
  return a;
};

const makeSourceKey = (url: string | null) => {
  return url ? parseUrl(url.toLowerCase()).hostname : "";
};

export const showReport = async () => {
  // TODO: switch default to production report version before production deploy
  const reportLink = (queryValue("portal-report") as string) || DEFAULT_PORTAL_REPORT_URL;
  const reportFirebaseApp = (queryValue("tool-id") as string) || DEFAULT_PORTAL_REPORT_FIREBASE_APP;
  const activity = queryValue("activity");
  const activityUrl = activity? ((activity.split(".json"))[0]).replace("api/v1/","") : "";
  const runKey= queryValue("runKey");
  // Sometimes the location of the answers is overridden with a report-source param
  const answerSource = queryValue("report-source") || window.location.hostname;

  if (runKey) {
    window.open(reportLink + "?runKey=" + runKey + "&activity=" + activityUrl + "&answerSource="+answerSource);
  }
  else {
    const portalData = await fetchPortalData();
    const classInfoUrl = portalData?.portalJWT?.class_info_url;
    const sourceKey = activityUrl ? makeSourceKey(activityUrl) : window.location.hostname;
    const authDomainUrl = classInfoUrl?.split("/api")[0];
    const offeringBaseUrl = classInfoUrl?.split("/classes")[0]+"/offerings/";
    const offeringId = portalData?.offering.id;
    const offeringUrl = encodeURIComponent(offeringBaseUrl + offeringId);
    const studentId = portalData?.platformUserId;
    const reportURL = reportLink
                      + "?"
                      // In the future we should be able to drop this because the portal
                      // report should be able to get all the info it needs from the
                      // offering url
                      + "class=" + encodeURIComponent(classInfoUrl || "")
                      + "&firebase-app="+reportFirebaseApp
                      + "&offering=" + offeringUrl
                      + "&reportType=offering&studentId="+studentId
                      + "&sourceKey="+sourceKey
                      + "&answersSourceKey="+answerSource
                      + "&auth-domain="+authDomainUrl;
    window.open(reportURL);
  }


};
