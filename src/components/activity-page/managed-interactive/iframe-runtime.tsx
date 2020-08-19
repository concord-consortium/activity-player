// cf. https://github.com/concord-consortium/question-interactives/blob/master/src/scaffolded-question/components/iframe-runtime.tsx
import React, { useEffect, useRef, useState } from "react";
import { IframePhone } from "../../../types";
import iframePhone from "iframe-phone";
import { ILinkedInteractive } from "@concord-consortium/lara-interactive-api";

const kDefaultHeight = 300;

// This should be part of lara-interactive-api
interface ILogRequest {
  action: string;
  data: Record<string, unknown>;
}

interface IProps {
  url: string;
  authoredState: any;
  initialInteractiveState: any;
  setInteractiveState: (state: any) => void;
  linkedInteractives?: ILinkedInteractive[];
  report?: boolean;
  proposedHeight?: number;
  containerWidth?: number;
  setNewHint: (newHint: string) => void;
  toggleModal?: any;
}

export const IframeRuntime: React.FC<IProps> =
  ({ url, authoredState, initialInteractiveState, setInteractiveState, linkedInteractives,
      report, proposedHeight, containerWidth, setNewHint, toggleModal }) => {
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
      });
      phone.addListener("hint", (newHint: any) => {
        setNewHint(newHint.text || "");
      });
      phone.addListener("showModal", (modalProps: any) => {
        toggleModal(modalProps);
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
    }
    // Cleanup.
    return () => {
      if (phoneRef.current) {
        phoneRef.current.disconnect();
      }
    };
  }, [url, authoredState, report, initialInteractiveState, setNewHint]);

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
