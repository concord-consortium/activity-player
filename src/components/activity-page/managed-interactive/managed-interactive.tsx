import React from "react";
import { IframeRuntime } from "./iframe-runtime";
import useResizeObserver from "@react-hook/resize-observer";
import { IRuntimeMetadata } from "@concord-consortium/lara-interactive-api";
import { IManagedInteractive, IMwInteractive, LibraryInteractiveData, IExportableAnswerMetadata } from "../../../types";
import { getAnswerWithMetadata } from "../../../utilities/embeddable-utils";
import { createOrUpdateAnswer } from "../../../firebase-db";

interface IProps {
  embeddable: IManagedInteractive | IMwInteractive;
  questionNumber?: number;
  initialInteractiveState: any;     // user state that existed in DB when embeddable was first loaded
  initialAnswerMeta?: IExportableAnswerMetadata;   // saved metadata for that initial user state
}

const kDefaultAspectRatio = 4 / 3;

export const ManagedInteractive: React.FC<IProps> = (props) => {

    const handleNewInteractiveState = (state: IRuntimeMetadata) => {
      const exportableAnswer = getAnswerWithMetadata(state, props.embeddable as IManagedInteractive, props.initialAnswerMeta);
      if (exportableAnswer) {
        createOrUpdateAnswer(exportableAnswer);
      }
    };

    const { embeddable, questionNumber, initialInteractiveState } = props;
    const questionName = embeddable.name ? `: ${embeddable.name}` : "";
    // in older iframe interactive embeddables, we get url, native_width, native_height, etc. directly off
    // of the embeddable object. On newer managed/library interactives, this data is in library_interactive.data.
    let embeddableData: IMwInteractive | LibraryInteractiveData;
    if (embeddable.type === "ManagedInteractive") {
      embeddableData = embeddable.library_interactive.data;
    } else {
      embeddableData = embeddable;
    }
    const url = embeddableData.base_url || embeddableData.url || "";
    // TODO: handle different aspect ration methods
    // const aspectRatioMethod = data.aspect_ratio_method ? data.aspect_ratio_method : "";
    const nativeHeight = embeddableData.native_height || 0;
    const nativeWidth = embeddableData.native_width || 0;
    const aspectRatio = nativeHeight && nativeWidth ? nativeWidth / nativeHeight : kDefaultAspectRatio;

    // cf. https://www.npmjs.com/package/@react-hook/resize-observer
    const useSize = (target: any) => {
      const [size, setSize] = React.useState();

      React.useLayoutEffect(() => {
        setSize(target.current.getBoundingClientRect());
      }, [target]);

      useResizeObserver(target, (entry: any) => setSize(entry.contentRect));
      return size;
    };

    const divTarget = React.useRef(null);
    const divSize: any = useSize(divTarget);
    const proposedHeight: number = divSize && divSize.width / aspectRatio;
    const containerWidth: number = divSize && divSize.width;
    return (
      <div ref={divTarget}>
        { questionNumber && <div className="header">Question #{questionNumber}{questionName}</div> }
        <IframeRuntime
          url={url}
          authoredState={embeddable.authored_state}
          initialInteractiveState={initialInteractiveState}
          setInteractiveState={handleNewInteractiveState}
          proposedHeight={proposedHeight}
          containerWidth={containerWidth}
        />
      </div>
    );
  };
