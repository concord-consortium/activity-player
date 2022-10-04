import React, { useState, useCallback, useContext, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import Modal from "react-modal";
import { IframeRuntime, IframeRuntimeImperativeAPI } from "./iframe-runtime";
import useResizeObserver from "@react-hook/resize-observer";
import {
  ICloseModal, INavigationOptions,
  ICustomMessage, IShowDialog, IShowLightbox, IShowModal, ISupportedFeatures, IAttachmentUrlRequest, IAttachmentUrlResponse, IGetInteractiveState
} from "@concord-consortium/lara-interactive-api";
import { PortalDataContext } from "../../portal-data-context";
import { IManagedInteractive, IMwInteractive, LibraryInteractiveData, IExportableAnswerMetadata, ILegacyLinkedInteractiveState } from "../../../types";
import { createOrUpdateAnswer, watchAnswer, getLegacyLinkedInteractiveInfo, getAnswer } from "../../../firebase-db";
import { handleGetFirebaseJWT } from "../../../portal-utils";
import { getAnswerWithMetadata, getInteractiveInfo, hasLegacyLinkedInteractive, IInteractiveInfo, isQuestion } from "../../../utilities/embeddable-utils";
import IconQuestion from "../../../assets/svg-icons/icon-question.svg";
import IconArrowUp from "../../../assets/svg-icons/icon-arrow-up.svg";
import { accessibilityClick } from "../../../utilities/accessibility-helper";
import { renderHTML } from "../../../utilities/render-html";
import { safeJsonParseIfString } from "../../../utilities/safe-json-parse";
import { Lightbox } from "./lightbox";
import { Logger, LogEventName } from "../../../lib/logger";
import { handleGetAttachmentUrl } from "@concord-consortium/interactive-api-host";
import { LaraDataContext } from "../../lara-data-context";
import { ClickToPlay } from "./click-to-play";

import "./managed-interactive.scss";

interface IProps {
  embeddable: IManagedInteractive | IMwInteractive;
  questionNumber?: number;
  setSupportedFeatures: (container: HTMLElement, features: ISupportedFeatures) => void;
  setSendCustomMessage: (sender: (message: ICustomMessage) => void) => void;
  setNavigation?: (options: INavigationOptions) => void;
  ref?: React.Ref<ManagedInteractiveImperativeAPI>;
  emitInteractiveAvailable?: () => void;
}

export interface ManagedInteractiveImperativeAPI {
  requestInteractiveState: (options?: IGetInteractiveState) => Promise<void>;
}

export interface IClickToPlayOptions {
  prompt?: string | null;
  imageUrl?: string | null;
}

const kDefaultAspectRatio = 4 / 3;
const kBottomMargin = 15;
const getModalContainer = (): HTMLElement => {
  return document.getElementById("app") || document.body;
};

export const ManagedInteractive: React.ForwardRefExoticComponent<IProps> = forwardRef((props, ref) => {
  const iframeRuntimeRef = useRef<IframeRuntimeImperativeAPI>(null);
  const onSetInteractiveStateCallback = useRef<() => void>();
  const interactiveState = useRef<any>();
  const legacyLinkedInteractiveState = useRef<ILegacyLinkedInteractiveState | null>(null);
  const answerMeta = useRef<IExportableAnswerMetadata>();
  const shouldWatchAnswer = isQuestion(props.embeddable);
  const laraData = useContext(LaraDataContext);
  const shouldLoadLegacyLinkedInteractiveState = hasLegacyLinkedInteractive(props.embeddable, laraData);
  const [loadingAnswer, setLoadingAnswer] = useState(shouldWatchAnswer);
  const [loadingLegacyLinkedInteractiveState, setLoadingLegacyLinkedInteractiveState] = useState(shouldLoadLegacyLinkedInteractiveState);
  const interactiveInfo = useRef<IInteractiveInfo | undefined>(undefined);
  const [clickToPlayOptions, setClickToPlayOptions] = useState<IClickToPlayOptions|undefined>(undefined);
  const [clickedToPlay, setClickedToPlay] = useState(false);
  const [ARFromSupportedFeatures, setARFromSupportedFeatures] = useState(0);
  const [heightFromInteractive, setHeightFromInteractive] = useState(0);

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
        legacyLinkedInteractiveState.current = info;
        setLoadingLegacyLinkedInteractiveState(false);
      });
    }
  }, [embeddableRefId, laraData, shouldLoadLegacyLinkedInteractiveState]);

  useEffect(() => {
    interactiveInfo.current = getInteractiveInfo(laraData, embeddableRefId);
  }, [embeddableRefId, laraData]);

  const handleNewInteractiveState = (state: any) => {
    // Keep interactive state in sync if iFrame is opened in modal popup
    interactiveState.current = state;
    const exportableAnswer =  shouldWatchAnswer && getAnswerWithMetadata(state, props.embeddable as IManagedInteractive, answerMeta.current);
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
  const [activeDialog, setActiveDialog] = useState<IShowDialog | null>(null);
  const [activeLightbox, setActiveLightbox] = useState<IShowLightbox | null>(null);
  const questionName = embeddable.name ? `: ${embeddable.name}` : "";
  // in older iframe interactive embeddables, we get url, native_width, native_height, etc. directly off
  // of the embeddable object. On newer managed/library interactives, this data is in library_interactive.data.
  let embeddableData:  IMwInteractive | LibraryInteractiveData | undefined;

  if (embeddable.type === "ManagedInteractive") {
    embeddableData = embeddable.library_interactive?.data;
  } else {
    embeddableData = embeddable;
  }

  let aspectRatioMethod;

  if (embeddable.type === "ManagedInteractive" && !embeddable.inherit_aspect_ratio_method) {
    aspectRatioMethod = embeddable.custom_aspect_ratio_method || "DEFAULT";
  } else {
    aspectRatioMethod = embeddableData?.aspect_ratio_method || "DEFAULT";
  }

  const url = embeddableData?.base_url || embeddableData?.url || "";
  const authoredState = useMemo(() => safeJsonParseIfString(authored_state) || {}, [authored_state]);
  const linkedInteractives = useRef(embeddable.linked_interactives?.length
    ? embeddable.linked_interactives.map(link => ({ id: link.ref_id, label: link.label }))
    : undefined);
  // interactiveId value should always match IDs generated above in the `linkedInteractives` array.
  const interactiveId = embeddable.ref_id;

  let proposedHeight: number;
  let nativeHeight: number;
  let nativeWidth: number;
  let aspectRatio: number;

  if (embeddable.type === "ManagedInteractive"  && !embeddable.inherit_aspect_ratio_method) {
    nativeHeight = embeddable.custom_native_height || 0;
    nativeWidth = embeddable.custom_native_width || 0;
  } else {
    nativeHeight = embeddableData?.native_height || 0;
    nativeWidth = embeddableData?.native_width || 0;
  }

  if (aspectRatioMethod === "DEFAULT" && ARFromSupportedFeatures) {
    aspectRatio = ARFromSupportedFeatures;
  } else if (aspectRatioMethod === "MANUAL") {
    aspectRatio = nativeWidth / nativeHeight;
  } else {
    aspectRatio = kDefaultAspectRatio;
  }

  useEffect(() => {
    setClickToPlayOptions(embeddableData?.click_to_play
    ? ({
        prompt: embeddableData.click_to_play_prompt,
        imageUrl: embeddableData.image_url
      })
    : undefined);
  }, [embeddableData]);

  // cf. https://www.npmjs.com/package/@react-hook/resize-observer
  const useSize = (target: any) => {
    const [size, setSize] = React.useState();

    React.useLayoutEffect(() => {
      if (target.current) {
      setSize(target.current.getBoundingClientRect());
      }
    }, [target]);

    useResizeObserver(target, (entry: any) => setSize(entry.contentRect));
    return size;

  };

  // use this to get height when aspect ratio method is "MAX"
  const [screenHeight, getDimension] = useState({
    dynamicHeight: window.innerHeight
  });

  const setDimension = () => {
    getDimension({
      dynamicHeight: window.innerHeight
    });
  };

  useEffect(() => {
    window.addEventListener("resize", setDimension);
    return(() => {
        window.removeEventListener("resize", setDimension);
    });
  }, [screenHeight]);


  const setShowDeleteDataButton = () => {
    return embeddable.type === "MwInteractive"
             && embeddable.enable_learner_state
             && embeddable.show_delete_data_button
           || embeddable.type === "ManagedInteractive"
             && embeddable.library_interactive?.data.enable_learner_state
             && embeddable.library_interactive.data.show_delete_data_button;
  };

  const showDeleteDataButton = setShowDeleteDataButton();
  const headerTarget = React.useRef(null);
  const divTarget = React.useRef<HTMLDivElement>(null);
  const divSize: any = useSize(divTarget);
  const headerSize: any = useSize(headerTarget);
  const headerHeight = headerSize?.height || 0;
  const deleteDataButtonHeight = showDeleteDataButton ? 44 : 0;
  const unusableHeight = kBottomMargin + headerHeight + deleteDataButtonHeight;
  const maxHeight = screenHeight.dynamicHeight * .98;
  let containerWidth: number | string = "100%";

  switch (aspectRatioMethod) {
    case "MAX":
      // if set to max, we set interactive height via CSS
      proposedHeight = 0;
      break;
    case "MANUAL":
      proposedHeight = divSize?.width / aspectRatio;
      break;
    case "DEFAULT":
    default:
      if (heightFromInteractive) {
        proposedHeight = heightFromInteractive;
        containerWidth = "100%";
      }
      else if ((divSize?.width / aspectRatio) > (maxHeight - unusableHeight)) {
        proposedHeight = maxHeight - unusableHeight;
        containerWidth = (maxHeight * aspectRatio) > divSize?.width ? "100%" : (maxHeight * aspectRatio);
      } else {
        proposedHeight = (divSize?.width / aspectRatio);
      }
  }

  const [showHint, setShowHint] = useState(false);
  const [hint, setHint] = useState("");
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

  const getAnswerMetadata = async (answerInteractiveId?: string) => {
    if (answerInteractiveId) {
      const wrappedAnswer = await getAnswer(answerInteractiveId);
      if (wrappedAnswer) {
        return wrappedAnswer.meta;
      }
    }
    return answerMeta.current;
  };

  const handleGetAttachmentUrlRequest = async (request: IAttachmentUrlRequest): Promise<IAttachmentUrlResponse> => {
    // the answerMetadata does not exist for interactives that have never been saved before now
    let answerMetadata: IExportableAnswerMetadata = answerMeta.current || {} as any;
    // normally, the interactiveId is only present when requesting data for a linked interactive, but it's
    // possible an interactive will set interactiveId to be its own ID
    if (request.interactiveId) {
      answerMetadata = (await getAnswerMetadata(request.interactiveId)) || ({} as any);
    }
    return await handleGetAttachmentUrl({
      request,
      answerMeta: answerMetadata,
      writeOptions: {
        interactiveId,
        onAnswerMetaUpdate: newMeta => {
          // don't allow writes over passed in interactiveId (for now, until it is needed and thought through...)
          if (!answerMeta.current && request.interactiveId && request.interactiveId !== interactiveId) {
            return { error: "writing to another interactive is not allowed", requestId: request.requestId };
          }
          if (!answerMeta.current) {
            // allow answers that are only attachments (e.g., a recorded audio response)
            answerMeta.current = getAnswerWithMetadata({}, props.embeddable);
          }
          createOrUpdateAnswer({ ...answerMeta.current, ...newMeta });
        }
      }
    });
  };

  const handleClickToPlay = () => {
    setClickToPlayOptions(undefined);
    setClickedToPlay(true);
    // in the current Lara code we emit the interactive is available even if the iframe src it not set yet
    props.emitInteractiveAvailable?.();
  };

  useImperativeHandle(ref, () => ({
    requestInteractiveState: (options?: IGetInteractiveState) => {
      if (shouldWatchAnswer && iframeRuntimeRef.current) {
        return iframeRuntimeRef.current.requestInteractiveState(options);
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
  const hasQuestionNumber = questionNumber ? "runtime-container has-question-number" : "runtime-container";

  const interactiveIframeRuntime =
    loadingAnswer || loadingLegacyLinkedInteractiveState ?
      "Loading..." :
      <IframeRuntime
        ref={iframeRuntimeRef}
        url={iframeUrl}
        id={interactiveId}
        authoredState={authoredState}
        initialInteractiveState={interactiveState.current}
        legacyLinkedInteractiveState={legacyLinkedInteractiveState.current}
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
        answerMetadata={answerMeta.current}
        interactiveInfo={interactiveInfo.current}
        showDeleteDataButton={showDeleteDataButton}
        setAspectRatio={setARFromSupportedFeatures}
        setHeightFromInteractive={setHeightFromInteractive}
      />;


  return (
    <div ref={divTarget} className="managed-interactive" data-cy="managed-interactive">
      <div className={hasQuestionNumber} style={{width:containerWidth}}>
      { questionNumber &&
        <div className="header" ref={headerTarget}>
          Question #{questionNumber}{questionName}
          {hint &&
            <div className="question-container"
              onClick={handleShowHint}
              onKeyDown={handleShowHint}
              data-cy="open-hint"
              tabIndex={0}>
              <IconQuestion className="question" height={22} width={22} />
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
      {clickToPlayOptions && !clickedToPlay
        ? <ClickToPlay
            prompt={clickToPlayOptions.prompt}
            imageUrl={clickToPlayOptions.imageUrl}
            onClick={handleClickToPlay}
          />
        : <>
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
          </>
      }
      </div>
    </div>
    );
  });
ManagedInteractive.displayName = "ManagedInteractive";
