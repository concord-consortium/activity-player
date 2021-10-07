import React, { useState, useCallback, useContext, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import Modal from "react-modal";
import { IframeRuntime, IframeRuntimeImperativeAPI } from "./iframe-runtime";
import useResizeObserver from "@react-hook/resize-observer";
import {
  ICloseModal, INavigationOptions,
  ICustomMessage, IShowDialog, IShowLightbox, IShowModal, ISupportedFeatures, IAttachmentUrlRequest, IAttachmentUrlResponse
} from "@concord-consortium/lara-interactive-api";
import { PortalDataContext } from "../../portal-data-context";
import { IManagedInteractive, IMwInteractive, LibraryInteractiveData, IExportableAnswerMetadata, ILegacyInteractiveState } from "../../../types";
import { createOrUpdateAnswer, watchAnswer, getLegacyLinkedInteractiveInfo } from "../../../firebase-db";
import { handleGetFirebaseJWT } from "../../../portal-utils";
import { getAnswerWithMetadata, hasLegacyLinkedInteractive, isQuestion } from "../../../utilities/embeddable-utils";
import IconQuestion from "../../../assets/svg-icons/icon-question.svg";
import IconArrowUp from "../../../assets/svg-icons/icon-arrow-up.svg";
import { accessibilityClick } from "../../../utilities/accessibility-helper";
import { renderHTML } from "../../../utilities/render-html";
import { safeJsonParseIfString } from "../../../utilities/safe-json-parse";
import { Lightbox } from "./lightbox";
import { Logger, LogEventName } from "../../../lib/logger";
import { handleGetAttachmentUrl } from "@concord-consortium/interactive-api-host";
import { LaraDataContext } from "../../lara-data-context";

import "./managed-interactive.scss";

interface IProps {
  embeddable: IManagedInteractive | IMwInteractive;
  questionNumber?: number;
  setSupportedFeatures: (container: HTMLElement, features: ISupportedFeatures) => void;
  setSendCustomMessage: (sender: (message: ICustomMessage) => void) => void;
  setNavigation?: (options: INavigationOptions) => void;
  ref?: React.Ref<ManagedInteractiveImperativeAPI>;
}

export interface ManagedInteractiveImperativeAPI {
  requestInteractiveState: () => Promise<void>;
}

const kDefaultAspectRatio = 4 / 3;

const getModalContainer = (): HTMLElement => {
  return document.getElementById("app") || document.body;
};

export const ManagedInteractive: React.ForwardRefExoticComponent<IProps> = forwardRef((props, ref) => {
  const iframeRuntimeRef = useRef<IframeRuntimeImperativeAPI>(null);
  const onSetInteractiveStateCallback = useRef<() => void>();
  const interactiveState = useRef<any>();
  const legacyInteractiveState = useRef<ILegacyInteractiveState | null>(null);
  const answerMeta = useRef<IExportableAnswerMetadata>();
  const shouldWatchAnswer = isQuestion(props.embeddable);
  const laraData = useContext(LaraDataContext);
  const shouldLoadLegacyLinkedInteractiveState = hasLegacyLinkedInteractive(props.embeddable, laraData);
  const [loadingAnswer, setLoadingAnswer] = useState(shouldWatchAnswer);
  const [loadingLegacyLinkedInteractiveState, setLoadingLegacyLinkedInteractiveState] = useState(shouldLoadLegacyLinkedInteractiveState);

  const embeddableRefId = props.embeddable.ref_id;
  useEffect(() => {
    if (shouldWatchAnswer) {
      return watchAnswer(embeddableRefId, (wrappedAnswer) => {
        answerMeta.current = wrappedAnswer?.meta;
        interactiveState.current = wrappedAnswer?.interactiveState;
        setLoadingAnswer(false);
      });
    }
  }, [embeddableRefId, shouldWatchAnswer]);

  useEffect(() => {
    if (shouldLoadLegacyLinkedInteractiveState && (laraData.activity || laraData.sequence)) {
      return getLegacyLinkedInteractiveInfo(embeddableRefId, laraData, (info) => {
        legacyInteractiveState.current = info;
        setLoadingLegacyLinkedInteractiveState(false);
      });
    }
  }, [embeddableRefId, laraData, shouldLoadLegacyLinkedInteractiveState]);

  const handleNewInteractiveState = (state: any) => {
    // Keep interactive state in sync if iFrame is opened in modal popup
    interactiveState.current = state;

    const exportableAnswer = getAnswerWithMetadata(state, props.embeddable, answerMeta.current);
    if (exportableAnswer) {
      createOrUpdateAnswer(exportableAnswer);
    }
    // Custom callback set internally. Used by the modal dialog to close itself after the most recent
    // interactive state is received.
    onSetInteractiveStateCallback.current?.();
    onSetInteractiveStateCallback.current = undefined;
  };

  const portalData = useContext(PortalDataContext);
  const getFirebaseJWT = useCallback((firebaseApp: string, others: Record<string, any>) => {
    return handleGetFirebaseJWT({ firebase_app: firebaseApp, ...others }, portalData);
  }, [portalData]);

  const { embeddable, questionNumber, setSupportedFeatures, setSendCustomMessage, setNavigation } = props;
  const { authored_state } = embeddable;
  const [ activeDialog, setActiveDialog ] = useState<IShowDialog | null>(null);
  const [ activeLightbox, setActiveLightbox ] = useState<IShowLightbox | null>(null);
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
  const authoredState = useMemo(() => safeJsonParseIfString(authored_state) || {}, [authored_state]);
  const linkedInteractives = useRef(embeddable.linked_interactives?.length
                                ? embeddable.linked_interactives.map(link => ({ id: link.ref_id, label: link.label }))
                                : undefined);
  // interactiveId value should always match IDs generated above in the `linkedInteractives` array.
  const interactiveId = embeddable.ref_id;
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
    Logger.log({
      event: LogEventName.toggle_hint,
      parameters: { show_hint: false, hint }
    });
    setShowHint(false);
  };
  const handleShowHint = () => {
    if (accessibilityClick(event)) {
      Logger.log({
        event: LogEventName.toggle_hint,
        parameters: { show_hint: !showHint, hint }
      });
      setShowHint(!showHint);
    }
  };
  const setNewHint = useCallback((newHint: string) => {
    setHint(newHint);
  }, []);

  const showModal = useCallback((options: IShowModal) => {
    // Difference between dialog and lightbox:
    // - dialog will assume that the provided URL is an interactive, so it'll use iframe-runtime component to render this URL
    // - lightbox does not use iframe-runtime. It just displays URL in a generic iframe or uses <img> tag when `options.isImage` === true
    if (options.type === "dialog") {
      setActiveDialog(options);
    } else if (options.type === "lightbox") {
      setActiveLightbox(options);
    } else {
      window.alert(`${options.type} modal type not implemented yet`);
    }
  }, []);

  const closeModal = useCallback((options: ICloseModal) => {
    // This code should work even if uuid is not provided (undefined).
    if (activeDialog?.uuid === options.uuid) {
      setActiveDialog(null);
    } else if (activeLightbox?.uuid === options.uuid) {
      setActiveLightbox(null);
    }
  }, [activeDialog, activeLightbox]);

  const handleCloseDialog = () => {
    // Request current interactive state in the dialog before closing it.
    iframeRuntimeRef.current?.requestInteractiveState();
    onSetInteractiveStateCallback.current = () => setActiveDialog(null);
  };

  const handleCloseLightbox = () => {
    setActiveLightbox(null);
  };

  const handleGetAttachmentUrlRequest = async (request: IAttachmentUrlRequest): Promise<IAttachmentUrlResponse> => {
    if (!answerMeta.current) {
      return { error: "error getting attachment url: no answer metadata", requestId: request.requestId };
    }
    return await handleGetAttachmentUrl({
      request,
      answerMeta: answerMeta.current,
      writeOptions: {
        interactiveId,
        onAnswerMetaUpdate: newMeta => {
          if (!answerMeta.current) {
            return { error: "error getting attachment url: no answer metadata", requestId: request.requestId };
          }
          createOrUpdateAnswer({ ...answerMeta.current, ...newMeta });
        }
      }
    });
  };

  useImperativeHandle(ref, () => ({
    requestInteractiveState: () => {
      if (shouldWatchAnswer && iframeRuntimeRef.current) {
        return iframeRuntimeRef.current.requestInteractiveState();
      } else {
        // Interactive doesn't save state, so return resolved promise immediately.
        return Promise.resolve();
      }
    }
  }));

  // embeddable.url_fragment is an optional string (path, query params, hash) that can be defined by author.
  // Some interactives are authored that way. Note that url_fragment is not merged with the dialog URL.
  // Each interactive will be first loaded inline with the url_fragment appended. So it can merge its custom dialog URL
  // with this fragment if necessary. ActivityPlayer doesn't have knowledge about URL format and provided url_fragment
  // to perform this merge automatically.
  const iframeUrl = activeDialog?.url || (embeddable.url_fragment ? url + embeddable.url_fragment : url);
  const miContainerClass = questionNumber ? "managed-interactive has-question-number" : "managed-interactive";
  const interactiveIframeRuntime =
    loadingAnswer || loadingLegacyLinkedInteractiveState ?
      "Loading..." :
      <IframeRuntime
        ref={iframeRuntimeRef}
        url={iframeUrl}
        id={interactiveId}
        authoredState={authoredState}
        initialInteractiveState={interactiveState.current}
        legacyLinkedInteractiveState={legacyInteractiveState.current}
        setInteractiveState={handleNewInteractiveState}
        setSupportedFeatures={setSupportedFeatures}
        linkedInteractives={linkedInteractives.current}
        proposedHeight={proposedHeight}
        containerWidth={containerWidth}
        setNewHint={setNewHint}
        getFirebaseJWT={getFirebaseJWT}
        getAttachmentUrl={handleGetAttachmentUrlRequest}
        showModal={showModal}
        closeModal={closeModal}
        setSendCustomMessage={setSendCustomMessage}
        setNavigation={setNavigation}
        iframeTitle={questionNumber
                     ? `Question ${questionNumber} ${questionName} content`
                     : embeddable.name || "Interactive content"}
        portalData={portalData}
      />;

    return (
      <div ref={divTarget} className={miContainerClass} data-cy="managed-interactive">
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
            <div className="hint question-txt" data-cy="hint">{renderHTML(hint)}</div>
            <div className="close-container">
              <IconArrowUp className={"close"} width={26} height={26}
                          onClick={handleHintClose}
                          onKeyDown={handleHintClose}
                          data-cy="close-hint"
                          tabIndex={0}/>
            </div>
          </div>
      }
      { !activeDialog && interactiveIframeRuntime }
      {
        activeDialog &&
        <Modal isOpen={true} appElement={getModalContainer()} onRequestClose={activeDialog.notCloseable ? undefined : handleCloseDialog}>
          { interactiveIframeRuntime }
        </Modal>
      }
      {
        activeLightbox && <Lightbox onClose={handleCloseLightbox} {...activeLightbox} />
      }
      </div>
    );
  });
ManagedInteractive.displayName = "ManagedInteractive";
