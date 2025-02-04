import { IPortalData } from "../portal-types";
import { queryValue } from "./url-query";

export const isOfferingLocked = (portalData?: IPortalData) => {
  return portalData?.offering.locked || queryValue("override:locked") === "true";
};
