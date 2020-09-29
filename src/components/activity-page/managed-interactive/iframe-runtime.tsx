// cf. https://github.com/concord-consortium/question-interactives/blob/master/src/scaffolded-question/components/iframe-runtime.tsx
import React, { useEffect, useRef, useState } from "react";
import { IframePhone } from "../../../types";
import iframePhone from "iframe-phone";
import { ICustomMessage, IGetFirebaseJwtRequest, ILinkedInteractive, ISupportedFeatures
      } from "@concord-consortium/lara-interactive-api";

const kDefaultHeight = 300;

interface IProps {
  url: string;
  authoredState: any;
  initialInteractiveState: any;
  setInteractiveState: (state: any) => void;
  setSupportedFeatures: (container: HTMLElement, features: ISupportedFeatures) => void;
  linkedInteractives?: ILinkedInteractive[];
  report?: boolean;
  proposedHeight?: number;
  containerWidth?: number;
  setNewHint: (newHint: string) => void;
  getFirebaseJWT: (firebaseApp: string, others: Record<string, any>) => Promise<string>;
  toggleModal: () => void;
  setSendCustomMessage: (sender: (message: ICustomMessage) => void) => void;
}

export const IframeRuntime: React.FC<IProps> =
  ({ url, authoredState, initialInteractiveState, setInteractiveState, linkedInteractives,
      report, proposedHeight, containerWidth, setNewHint, getFirebaseJWT, toggleModal,
      setSupportedFeatures, setSendCustomMessage }) => {
  const [ heightFromInteractive, setHeightFromInteractive ] = useState(0);
  const [ ARFromSupportedFeatures, setARFromSupportedFeatures ] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<IframePhone>();
  const setInteractiveStateRef = useRef<((state: any) => void)>(setInteractiveState);
  setInteractiveStateRef.current = setInteractiveState;
  const linkedInteractivesRef = useRef(linkedInteractives?.length ? { linkedInteractives } : undefined);

  useEffect(() => {
    const initInteractive = () => {
      const phone = phoneRef.current;
      if (!phone) {
        return;
      }
      phone.addListener("interactiveState", (newInteractiveState: any) => {
        setInteractiveStateRef.current(newInteractiveState);
      });
      phone.addListener("height", (newHeight: number) => {
        setHeightFromInteractive(newHeight);
      });
      phone.addListener("supportedFeatures", (info: any) => {
        if (info.features.aspectRatio) {
          setARFromSupportedFeatures(info.features.aspectRatio);
        }
        if (iframeRef.current) {
          setSupportedFeatures(iframeRef.current, info.features);
        }
      });
      phone.addListener("getFirebaseJWT", async (request: IGetFirebaseJwtRequest) => {
        const { requestId, firebase_app, ...others } = request || {};
        let errorMessage = "Error retrieving Firebase JWT!";
        try {
          const rawFirebaseJWT = await getFirebaseJWT(firebase_app, others);
          phone.post("firebaseJWT", { requestId, token: rawFirebaseJWT });
          errorMessage = "";
        }
        catch(e) {
          errorMessage = e.toString();
        }
        if (errorMessage) {
          phone.post("firebaseJWT", { requestId, response_type: "ERROR", message: errorMessage });
        }
      });
      phone.addListener("hint", (newHint: any) => {
        setNewHint(newHint.text || "");
      });
      phone.addListener("showModal", () => {
        toggleModal();
      });
      phone.post("initInteractive", {
        mode: report ? "report" : "runtime",
        authoredState,
        interactiveState: initialInteractiveState,
        ...linkedInteractivesRef.current
      });
    };

    if (iframeRef.current) {
      // Reload the iframe.
      iframeRef.current.src = url;
      // Re-init interactive, this time using a new mode (report or runtime).
      phoneRef.current = new iframePhone.ParentEndpoint(iframeRef.current, initInteractive);
      setSendCustomMessage((message: ICustomMessage) => {
        phoneRef.current?.post(message.type, message.content);
      });
    }
    // Cleanup.
    return () => {
      if (phoneRef.current) {
        phoneRef.current.disconnect();
      }
    };
  }, [url, authoredState, report, initialInteractiveState,
      setNewHint, getFirebaseJWT, toggleModal, setSupportedFeatures, setSendCustomMessage]);

  const heightFromSupportedFeatures = ARFromSupportedFeatures && containerWidth ? containerWidth / ARFromSupportedFeatures : 0;
  // There are several options for specifying the iframe height. Check if we have height specified by interactive (from IframePhone
  // "height" listener), height based on aspect ratio specified by interactive (from IframePhone "supportedFeatures" listener),
  // or height from container dimensions and embeddable specifications.
  const height = heightFromInteractive || heightFromSupportedFeatures || proposedHeight || kDefaultHeight;

  return (
    <div data-cy="iframe-runtime">
      <iframe ref={iframeRef} src={url} width="100%" height={height} frameBorder={0} />
    </div>
  );
};
IframeRuntime.displayName = "IframeRuntime";
