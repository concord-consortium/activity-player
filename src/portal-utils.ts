import { IGetFirebaseJwtRequest } from "@concord-consortium/lara-interactive-api";
import { getFirebaseJWT, IPortalData } from "./portal-api";
import { IframePhone } from "./types";

interface IGetFirebaseJWTArgs {
  phone: IframePhone;
  request: IGetFirebaseJwtRequest;
  portalData?: IPortalData;
}
export const handleGetFirebaseJWTRequest = async ({ phone, request, portalData }: IGetFirebaseJWTArgs) => {
  const { requestId, ...others } = request || {};
  let errorMessage = "Error retrieving Firebase JWT!";
  if (portalData?.basePortalUrl && portalData.rawPortalJWT) {
    const { learnerKey, basePortalUrl, rawPortalJWT } = portalData;
    const _learnerKey = learnerKey ? { learner_id_or_key: learnerKey } : undefined;
    const queryParams: Record<string, string> = { ...others, ..._learnerKey };
    try {
      const [rawFirebaseJWT] = await getFirebaseJWT(basePortalUrl, rawPortalJWT, queryParams);
      phone.post("firebaseJWT", { requestId, token: rawFirebaseJWT });
      errorMessage = "";
    }
    catch(e) {
      errorMessage = e.toString();
    }
  }
  if (errorMessage) {
    phone.post("firebaseJWT", { requestId, response_type: "ERROR", message: errorMessage });
  }
};
