import { queryValue } from "../utilities/url-query";
import { getPortalData } from "../firebase-db";
import { firebaseAppName } from "../portal-api";
import { IPortalData } from "../portal-types";
import { getCanonicalHostname, isProductionOrigin } from "./host-utils";
import { getResourceUrl } from "../lara-api";
import { refIdToAnswersQuestionId } from "./embeddable-utils";

// *** IMPORTANT NOTE ***
// When you change these URLs you need to edit the portal-report Auth Client in
// the portals to allow redirects back to the the updated URLs.
export const kProductionPortalReportUrl = "https://portal-report.concord.org/version/v4.10.0/index.html";
export const kDevPortalReportUrl = "https://portal-report.concord.org/branch/master/index.html";

// The default portal report URL is based on the URL:
// - [production-origin] and [production-origin]/version/*
//   defaults to the kProductionPortalReportUrl above
// - everything else defaults to kDevPortalReportUrl which is should be master
//
// The default can be overridden with a portalReport URL param
export const portalReportBaseUrl = (): string => {
  const portalReportUrlParam = queryValue("portalReport");
  if (portalReportUrlParam) {
    return portalReportUrlParam;
  }

  const { origin, pathname } = window.location;
  // According to the spec an empty path like https://activity-player.concord.org
  // will still have a pathname of "/", but just to be safe this checks for the
  // falsey pathname
  if (isProductionOrigin(origin) &&
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

export const getReportUrl = (questionRefId?: string) => {
  const reportLink = portalReportBaseUrl();
  const reportFirebaseApp = firebaseAppName();
  const resourceUrl = getResourceUrl();
  const runKey = queryValue("runKey");
  // Sometimes the location of the answers is overridden with a answersSourceKey param
  const answerSource = queryValue("answersSourceKey") || getCanonicalHostname();
  // `sourceKey` might be useful to add during local development, usually to point to app.lara.docker.<username>
  // since local LARA instance would be publish resources at this path.
  const sourceKey = queryValue("sourceKey") || (resourceUrl ? makeSourceKey(resourceUrl) : getCanonicalHostname());

  let result = reportLink
    + "?firebase-app=" + reportFirebaseApp
    + "&sourceKey=" + sourceKey
    + "&answersSourceKey=" + answerSource;

  if (runKey) {
    result += "&runKey=" + runKey
      + "&activity=" + resourceUrl
      + "&resourceUrl=" + resourceUrl;
  } else {
    // We know this is a IPortalData because there is no runKey
    const portalData = getPortalData() as IPortalData;
    // Handles logged in teachers that are previewing a non-assigned resource or are in teacher-edition mode
    if (!portalData?.offering) {
      return null;
    } else {
      const classInfoUrl = portalData?.portalJWT?.class_info_url;
      const authDomainUrl = classInfoUrl?.split("/api")[0];
      const offeringBaseUrl = classInfoUrl?.split("/classes")[0] + "/offerings/";
      const offeringId = portalData?.offering.id;
      const offeringUrl = encodeURIComponent(offeringBaseUrl + offeringId);
      const studentId = portalData?.platformUserId;

      // In the future we should be able to drop this because the portal
      // report should be able to get all the info it needs from the
      // offering url
      result += "&class=" + encodeURIComponent(classInfoUrl || "")
        + "&offering=" + offeringUrl
        + "&reportType=offering&studentId=" + studentId
        + "&auth-domain=" + authDomainUrl;
    }
  }

  if (questionRefId) {
    // Limit report to a single question.
    result += "&iframeQuestionId=" + refIdToAnswersQuestionId(questionRefId);
  }

  return result;
};

export const isValidReportLink = () => {
  return getReportUrl() != null;
};

export const showReport = () => {
  // Handles not being able to send a null link to window.open
  const validReportLink = getReportUrl();
  if (validReportLink) {
    window.open(validReportLink);
  }
};
