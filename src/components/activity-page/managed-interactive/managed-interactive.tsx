import React, { useState, useEffect, useRef } from "react";
import { IframeRuntime } from "./iframe-runtime";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export const ManagedInteractive: React.FC<IProps> = (props) => {

    const handleNewInteractiveState = (state: any) => {
      // TODO: handle interactive state
    };

    const [initialHeight, setInitialHeight] = useState(0);
    const divRef: any = useRef();
    useEffect(() => {
      if (divRef) {
        const height = divRef.current.getBoundingClientRect().width * 3 / 4;
        setInitialHeight(height);
      }
    }, [divRef]);

    const { embeddable, questionNumber } = props;
    const questionName = embeddable.name ? `: ${embeddable.name}` : "";
    const url = embeddable.url
                ? embeddable.url
                : (embeddable.library_interactive.data.base_url ? embeddable.library_interactive.data.base_url : "");
    return (
      <div ref={divRef}>
        { questionNumber && <div className="header">Question #{questionNumber}{questionName}</div> }
        <IframeRuntime
          url={url}
          authoredState={embeddable.authored_state}
          interactiveState={null}
          setInteractiveState={handleNewInteractiveState}
          initialHeight={initialHeight ? initialHeight : undefined}
        />
      </div>
    );
  };
