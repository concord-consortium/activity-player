import React, { useState, useCallback, useContext, useMemo } from "react";
import { IframeRuntime } from "./iframe-runtime";
import useResizeObserver from "@react-hook/resize-observer";
import { IRuntimeMetadata, IGetFirebaseJwtRequest } from "@concord-consortium/lara-interactive-api";
import { PortalDataContext } from "../../portal-data-context";
import { IManagedInteractive, IMwInteractive, LibraryInteractiveData, IExportableAnswerMetadata, IframePhone } from "../../../types";
import { createOrUpdateAnswer } from "../../../firebase-db";
import { handleGetFirebaseJWTRequest } from "../../../portal-utils";
import { getAnswerWithMetadata } from "../../../utilities/embeddable-utils";
import IconQuestion from "../../../assets/svg-icons/icon-question.svg";
import IconArrowUp from "../../../assets/svg-icons/icon-arrow-up.svg";
import { accessibilityClick } from "../../../utilities/accessibility-helper";
import { renderHTML } from "../../../utilities/render-html";
import { safeJsonParseIfString } from "../../../utilities/safe-json-parse";

import "./managed-interactive.scss";

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

    const portalData = useContext(PortalDataContext);
    const handleGetFirebaseJWT = useCallback((phone: IframePhone, request: IGetFirebaseJwtRequest) => {
      handleGetFirebaseJWTRequest({ phone, request, portalData });
    }, [portalData]);

    const { embeddable, questionNumber, initialInteractiveState } = props;
    const { authored_state } = embeddable;
    const questionName = embeddable.name ? `: ${embeddable.name}` : "";
    // in older iframe interactive embeddables, we get url, native_width, native_height, etc. directly off
    // of the embeddable object. On newer managed/library interactives, this data is in library_interactive.data.
    let embeddableData: IMwInteractive | LibraryInteractiveData | undefined;
    if (embeddable.type === "ManagedInteractive") {
      embeddableData = embeddable.library_interactive?.data;
    } else {
      embeddableData = embeddable;
    }
    const url = embeddableData?.base_url || embeddableData?.url || "";
    const authoredState = useMemo(() => safeJsonParseIfString(authored_state), [authored_state]);
    const linkedInteractives = (embeddable.type === "ManagedInteractive") && embeddable.linked_interactives?.length
                                ? embeddable.linked_interactives.map(link => ({ id: link.ref_id, label: link.label }))
                                : undefined;
    // TODO: handle different aspect ratio methods
    // const aspectRatioMethod = data.aspect_ratio_method ? data.aspect_ratio_method : "";
    const nativeHeight = embeddableData?.native_height || 0;
    const nativeWidth = embeddableData?.native_width || 0;
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

    const [ showHint, setShowHint ] = useState(false);
    const [ hint, setHint ] = useState("");
    const handleHintClose = () => {
      setShowHint(false);
    };
    const handleShowHint = () => {
      if (accessibilityClick(event)) {
        setShowHint(!showHint);
      }
    };
    const setNewHint = useCallback((newHint: string) => {
      setHint(newHint);
    }, []);

    return (
      <div ref={divTarget} data-cy="managed-interactive">
        { questionNumber &&
          <div className="header">
            Question #{questionNumber}{questionName}
           { hint &&
             <div className="question-container" 
                  onClick={handleShowHint} 
                  onKeyDown={handleShowHint} 
                  data-cy="open-hint"
                  tabIndex={0}>
               <IconQuestion className="question" height={22} width={22}/>
             </div>
            }
          </div>
        }
        { hint &&
          <div className={`hint-container ${showHint ? "" : "collapsed"}`}>
            <div className="hint" data-cy="hint">{renderHTML(hint)}</div>
            <div className="close-container">
              <IconArrowUp className={"close"} width={26} height={26} 
                           onClick={handleHintClose} 
                           onKeyDown={handleHintClose} 
                           data-cy="close-hint" 
                           tabIndex={0}/>
            </div>
          </div>
        }
        <IframeRuntime
          url={url}
          authoredState={authoredState}
          initialInteractiveState={initialInteractiveState}
          setInteractiveState={handleNewInteractiveState}
          linkedInteractives={linkedInteractives}
          proposedHeight={proposedHeight}
          containerWidth={containerWidth}
          setNewHint={setNewHint}
          handleGetFirebaseJWT={handleGetFirebaseJWT}
        />
      </div>
    );
  };
ManagedInteractive.displayName = "ManagedInteractive";
