import { useContext, useEffect, useRef, useState } from "react";
import iframePhone from "iframe-phone";
import { IframePhone } from "../../../types";
import { IGetFirebaseJwtRequest, IHintRequest, ILinkedInteractive, ISupportedFeaturesRequest } from "@concord-consortium/lara-interactive-api";
import { IPortalData, getFirebaseJWT } from "../../../portal-api";
import { PortalDataContext } from "../../portal-data-context";
import { safeJsonParseIfString } from "../../../utilities/safe-json-parse";

interface IGetFirebaseJWTArgs {
  phone: IframePhone;
  request: IGetFirebaseJwtRequest;
  portalData?: IPortalData;
}
export const handleGetFirebaseJWT = async ({ phone, request, portalData }: IGetFirebaseJWTArgs) => {
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

interface IProps {
  url?: string;
  srcDoc?: string;  // potentially useful for testing
  report?: boolean;
  authoredState: any;
  linkedInteractives?: ILinkedInteractive[];
  initialInteractiveState: any;
  setInteractiveState: (state: any) => void;
  setHint: (hint: string) => void;
}
export const useInteractivePhoneWrapper = ({
              url, srcDoc, report, authoredState, linkedInteractives, initialInteractiveState,
              setInteractiveState, setHint }: IProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<IframePhone>();
  const setInteractiveStateRef = useRef<(state: any) => void>(setInteractiveState);
  const linkedInteractivesRef = useRef(linkedInteractives?.length ? { linkedInteractives } : undefined);
  const portalData = useContext(PortalDataContext);
  const [ height, setHeight ] = useState(0);
  const [ aspectRatio, setAspectRatio ] = useState(0);

  useEffect(() => {
    const initInteractive = () => {
      const phone = phoneRef.current;
      if (!phone) return;

      phone.addListener("interactiveState", (interactiveState: any) => {
        setInteractiveStateRef.current(interactiveState);
      });
      phone.addListener("height", (newHeight: number) => {
        setHeight(newHeight);
      });
      phone.addListener("supportedFeatures", (info: ISupportedFeaturesRequest) => {
        if (info.features.aspectRatio) {
          setAspectRatio(info.features.aspectRatio);
        }
      });
      phone.addListener("getFirebaseJWT", (request: IGetFirebaseJwtRequest) => {
        handleGetFirebaseJWT({ phone, request, portalData });
      });
      phone.addListener("hint", (newHint: IHintRequest) => {
        setHint(newHint.text || "");
      });
      phone.post("initInteractive", {
        mode: report ? "report" : "runtime",
        authoredState: safeJsonParseIfString(authoredState),
        interactiveState: initialInteractiveState,
        ...linkedInteractivesRef.current
      });
    };

    if (iframeRef.current) {
      // Reload the iframe.
      if (url) {
        iframeRef.current.src = url;
      }
      else if (srcDoc) {
        iframeRef.current.srcdoc = srcDoc;
      }
      // Re-init interactive, this time using a new mode (report or runtime).
      phoneRef.current = new iframePhone.ParentEndpoint(iframeRef.current, initInteractive);
    }
    // Cleanup.
    return () => {
      if (phoneRef.current) {
        phoneRef.current.disconnect();
      }
    };
  }, [url, srcDoc, report, iframeRef, portalData, authoredState, initialInteractiveState,
      setHeight, setAspectRatio, setHint]);

  return { iframeRef, height, aspectRatio };
};
