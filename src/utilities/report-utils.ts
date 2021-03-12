import { queryValue } from "../utilities/url-query";
import { Storage } from "../storage-facade";
import { IPortalData, firebaseAppName } from "../portal-api";
import { getResourceUrl } from "../lara-api";

export const kProductionPortalReportUrl = "https://portal-report.concord.org/version/v4.1.0/index.html";
export const kDevPortalReportUrl = "https://portal-report.concord.org/branch/master/index.html";

// The default portal report URL is based on the URL:
// - https://activity-player.concord.org and https://activity-player.concord.org/version/*
//   defaults to the kProductionPortalReportUrl above
// - everything else defaults to kDevPortalReportUrl which is should be master
//
// The default can be overridden with a portalReport URL param
const kActivityPlayerOrigin = "https://activity-player.concord.org";
export const portalReportBaseUrl= ():string => {
  const portalReportUrlParam = queryValue("portalReport");
  if (portalReportUrlParam) {
    return portalReportUrlParam;
  }

  const { origin, pathname } = window.location;
  // According to the spec an empty path like https://activity-player.concord.org
  // will still have a pathname of "/", but just to be safe this checks for the
  // falsey pathname
  if(origin === kActivityPlayerOrigin &&
     (!pathname || pathname === "/"
      || pathname.indexOf("/version/") === 0)) {
    return kProductionPortalReportUrl;
  } else {
    return kDevPortalReportUrl;
  }
};

const parseUrl = (url: string) => {
  const a = document.createElement("a");
  a.href = url;
  return a;
};

const makeSourceKey = (url: string | null) => {
  return url ? parseUrl(url.toLowerCase()).hostname : "";
};

export const getReportUrl = () => {
  const reportLink = portalReportBaseUrl();
  const reportFirebaseApp = firebaseAppName();
  const activity = queryValue("activity");
  const activityUrl = getResourceUrl(activity);
  const runKey = queryValue("runKey");
  // Sometimes the location of the answers is overridden with a report-source param
  const answerSource = queryValue("report-source") || window.location.hostname;
  const sourceKey = activityUrl ? makeSourceKey(activityUrl) : window.location.hostname;

  if (runKey) {
    return reportLink
            + "?"
            + "runKey=" + runKey
            + "&activity=" + activityUrl
            + "&firebase-app="+reportFirebaseApp
            + "&sourceKey="+sourceKey
            + "&answersSourceKey="+answerSource;
  }
  else {
    // We know this is a IPortalData because there is no runKey
    const portalData = Storage.getPortalData() as IPortalData;
    const classInfoUrl = portalData?.portalJWT?.class_info_url;
    const authDomainUrl = classInfoUrl?.split("/api")[0];
    const offeringBaseUrl = classInfoUrl?.split("/classes")[0]+"/offerings/";
    const offeringId = portalData?.offering.id;
    const offeringUrl = encodeURIComponent(offeringBaseUrl + offeringId);
    const studentId = portalData?.platformUserId;

    return reportLink
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
  }
};

export const showReport = () => {
  window.open(getReportUrl());
};
