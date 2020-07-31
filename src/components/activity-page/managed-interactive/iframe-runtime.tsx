// cf. https://github.com/concord-consortium/question-interactives/blob/master/src/scaffolded-question/components/iframe-runtime.tsx
import React, { useEffect, useRef, useState } from "react";
import { renderHTML } from "../../../utilities/render-html";
import { IframePhone } from "../../../types";
import iframePhone from "iframe-phone";

import "./iframe-runtime.scss";

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
  report?: boolean;
  proposedHeight?: number;
  containerWidth?: number;
}

export const IframeRuntime: React.FC<IProps> =
  ({ url, authoredState, initialInteractiveState, setInteractiveState, report, proposedHeight, containerWidth }) => {
  const [ heightFromInteractive, setHeightFromInteractive ] = useState(0);
  const [ ARFromSupportedFeatures, setARFromSupportedFeatures ] = useState(0);
  const [ hint, setHint ] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<IframePhone>();
  // Why is interativeState and setInteractiveState kept in refs? So it's not necessary to declare these variables as
  // useEffect's dependencies. Theoretically this useEffect callback is perfectly fine either way, but since
  // it reloads the iframe each time it's called, it's not a great experience for user when that happens while he is
  // interacting with the iframe (e.g. typing in textarea). And interactiveState is being updated very often,
  // as well as setInteractiveState that is generated during each render of the parent component.
  const interactiveStateRef = useRef<any>(initialInteractiveState);
  const setInteractiveStateRef = useRef<((state: any) => void)>(setInteractiveState);
  interactiveStateRef.current = initialInteractiveState;
  setInteractiveStateRef.current = setInteractiveState;

  useEffect(() => {
    const initInteractive = () => {
      const phone = phoneRef.current;
      if (!phone) {
        return;
      }
      phone.addListener("interactiveState", (newInteractiveState: any) => {
        setInteractiveStateRef.current?.(newInteractiveState);
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
        setHint(newHint.text || "");
      });
      phone.post("initInteractive", {
        mode: report ? "report" : "runtime",
        authoredState,
        // This is a trick not to depend on interactiveState.
        interactiveState: interactiveStateRef.current
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
  }, [url, authoredState, report, initialInteractiveState]);

  const heightFromSupportedFeatures = ARFromSupportedFeatures && containerWidth ? containerWidth / ARFromSupportedFeatures : 0;
  // There are several options for specifying the iframe height. Check if we have height specified by interactive (from IframePhone
  // "height" listener), height based on aspect ratio specified by interactive (from IframePhone "supportedFeatures" listener),
  // or height from container dimensions and embeddable specifications.
  const height = heightFromInteractive || heightFromSupportedFeatures || proposedHeight || kDefaultHeight;

  return (
    <div data-cy="iframe-runtime">
      <iframe ref={iframeRef} src={url} width="100%" height={height} frameBorder={0} />
      { hint &&
        <div className="hint">{renderHTML(hint)}</div> }
    </div>
  );
};
