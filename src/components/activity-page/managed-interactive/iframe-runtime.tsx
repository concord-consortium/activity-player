// cf. https://github.com/concord-consortium/question-interactives/blob/master/src/scaffolded-question/components/iframe-runtime.tsx
import React, { useRef } from "react";
import { ILinkedInteractive } from "@concord-consortium/lara-interactive-api";
import { useInteractivePhoneWrapper } from "./use-interactive-phone-wrapper";

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
}

export const IframeRuntime: React.FC<IProps> =
  ({ url, authoredState, initialInteractiveState, setInteractiveState, linkedInteractives,
      report, proposedHeight, containerWidth, setNewHint }) => {
  const setInteractiveStateRef = useRef<(state: any) => void>(setInteractiveState);
  setInteractiveStateRef.current = setInteractiveState;

  const { iframeRef, height: heightFromInteractive, aspectRatio } = useInteractivePhoneWrapper({
    url, report, authoredState, linkedInteractives, initialInteractiveState,
    setInteractiveState, setHint: setNewHint });

  const heightFromSupportedFeatures = aspectRatio && containerWidth ? containerWidth / aspectRatio : 0;
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
