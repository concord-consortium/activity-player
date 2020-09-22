import React, { useState, useCallback, useContext, useMemo, useRef } from "react";
import Modal from "react-modal";
import { IframeRuntime } from "./iframe-runtime";
import useResizeObserver from "@react-hook/resize-observer";
import { IRuntimeMetadata } from "@concord-consortium/lara-interactive-api";
import { PortalDataContext } from "../../portal-data-context";
import { IManagedInteractive, IMwInteractive, LibraryInteractiveData, IExportableAnswerMetadata } from "../../../types";
import { createOrUpdateAnswer } from "../../../firebase-db";
import { handleGetFirebaseJWT } from "../../../portal-utils";
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
      // Keep interactive state in sync if iFrame is opened in modal popup
      iframeInteractiveState.current = state;

      const exportableAnswer = getAnswerWithMetadata(state, props.embeddable as IManagedInteractive, props.initialAnswerMeta);
      if (exportableAnswer) {
        createOrUpdateAnswer(exportableAnswer);
      }
    };

    const portalData = useContext(PortalDataContext);
    const getFirebaseJWT = useCallback((firebaseApp: string, others: Record<string, any>) => {
      return handleGetFirebaseJWT({ firebase_app: firebaseApp, ...others }, portalData);
    }, [portalData]);

    const { embeddable, questionNumber, initialInteractiveState } = props;
    const { authored_state } = embeddable;
    const [showModal, setShowModal] = useState(false);
    // both Modal and inline versions of interactive should reflect the same state
    const iframeInteractiveState = useRef(initialInteractiveState);
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
    const authoredState = useMemo(() => {
      const state = safeJsonParseIfString(authored_state) || {};
      // enable modal support for activity player only
      state.modalSupported = true;
      return state;
    }, [authored_state]);
    const linkedInteractives = useRef((embeddable.type === "ManagedInteractive") && embeddable.linked_interactives?.length
                                  ? embeddable.linked_interactives.map(link => ({ id: link.ref_id, label: link.label }))
                                  : undefined);
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
    const proposedHeight: number = divSize?.width / aspectRatio;
    const containerWidth: number = divSize?.width;

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

    const getModalContainer = (): HTMLElement => {
      return document.getElementById("app") || document.body;
    };

    const toggleModal = useCallback(() => {
      setShowModal(!showModal);
    }, [showModal]);

    const handleCloseModalRequest = (modalProps?: any) => {
      if (modalProps) {
        handleNewInteractiveState(modalProps.interactiveState);
      }
    };

    const interactiveIframe =
      <IframeRuntime
        url={url}
        authoredState={authoredState}
        initialInteractiveState={iframeInteractiveState.current}
        setInteractiveState={handleNewInteractiveState}
        linkedInteractives={linkedInteractives.current}
        proposedHeight={proposedHeight}
        containerWidth={containerWidth}
        setNewHint={setNewHint}
        getFirebaseJWT={getFirebaseJWT}
        toggleModal={toggleModal}
      />;

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
      {!showModal && interactiveIframe}
      <Modal isOpen={showModal} appElement={getModalContainer()} onRequestClose={handleCloseModalRequest}>
        {interactiveIframe}
      </Modal>
      </div>
    );
  };
ManagedInteractive.displayName = "ManagedInteractive";
