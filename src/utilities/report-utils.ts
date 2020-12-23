import { queryValue } from "../utilities/url-query";
import { DEFAULT_PORTAL_REPORT_URL, DEFAULT_PORTAL_REPORT_FIREBASE_APP } from "../components/app";
import { fetchPortalData } from "../portal-api";

export const showReport = async () => {
  // TODO: switch default to production report version before production deploy
  const reportLink = (queryValue("portal-report") as string) || DEFAULT_PORTAL_REPORT_URL;
  const reportFirebaseApp = (queryValue("tool-id") as string) || DEFAULT_PORTAL_REPORT_FIREBASE_APP;
  const activity = queryValue("activity");
  const activityUrl = activity? ((activity.split(".json"))[0]).replace("api/v1/","") : "";
  const runKey= queryValue("runKey");
  const answerSource = window.location.hostname;

  if (runKey) {
    window.open(reportLink + "?runKey=" + runKey + "&activity=" + activityUrl + "&answerSource="+answerSource);
  }
  else {
    const portalData = await fetchPortalData();
    const classInfoUrl = portalData?.portalJWT?.class_info_url;
    const classId = classInfoUrl?.split("classes/")[1];
    // const activityHostUrl = activityUrl? ((activityUrl.split("/activities"))[0]) : "";
    const authDomainUrl = classInfoUrl?.split("/api")[0];
    const offeringBaseUrl = classInfoUrl?.split("/classes")[0]+"/offerings/";
    const classOfferings = encodeURIComponent(offeringBaseUrl+"?class_id=" + classId);
    const offeringId = portalData?.offering.id;
    const offeringUrl = encodeURIComponent(offeringBaseUrl + offeringId);
    const studentId = portalData?.platformUserId;
    const reportURL = reportLink
                      + "?"
                      + "class=" + encodeURIComponent(classInfoUrl || "")
                      + "&classOfferings=" + classOfferings
                      + "&firebase-app="+reportFirebaseApp
                      + "&offering=" + offeringUrl
                      + "&activityUrl=" + activityUrl
                      + "&reportType=offering&studentId="+studentId
                      + "&resourceSource=authoring.staging.concord.org"
                      + "&answerSource="+answerSource
                      + "&auth-domain="+authDomainUrl;
    window.open(reportURL);
  }


};
