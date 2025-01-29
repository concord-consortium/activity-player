import React, { useState, useCallback, useContext, useMemo, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import Modal from "react-modal";
import { IframeRuntime, IframeRuntimeImperativeAPI } from "./iframe-runtime";
import {
  ICloseModal, INavigationOptions,
  ICustomMessage, IShowDialog, IShowLightbox, IShowModal, ISupportedFeatures, IAttachmentUrlRequest, IAttachmentUrlResponse, IGetInteractiveState
} from "@concord-consortium/lara-interactive-api";
import classNames from "classnames";

import { PortalDataContext } from "../../portal-data-context";
import { useSizeAndAspectRatio } from "../../../hooks/use-aspect-ratio";
import { useSize } from "../../../hooks/use-size";
import { IManagedInteractive, IMwInteractive, IExportableAnswerMetadata, ILegacyLinkedInteractiveState, QuestionFeedback } from "../../../types";
import { createOrUpdateAnswer, watchAnswer, getLegacyLinkedInteractiveInfo, getAnswer, watchQuestionLevelFeedback } from "../../../firebase-db";
import { handleGetFirebaseJWT } from "../../../portal-utils";
import { getAnswerWithMetadata, getInteractiveInfo, hasLegacyLinkedInteractive, IInteractiveInfo, isQuestion, refIdToAnswersQuestionId } from "../../../utilities/embeddable-utils";
import { accessibilityClick } from "../../../utilities/accessibility-helper";
import { safeJsonParseIfString } from "../../../utilities/safe-json-parse";
import { Lightbox } from "./lightbox";
import { Logger, LogEventName } from "../../../lib/logger";
import { handleGetAttachmentUrl } from "@concord-consortium/interactive-api-host";
import { LaraDataContext } from "../../lara-data-context";
import { ClickToPlay } from "./click-to-play";
import { ManagedInteractiveHeader } from "./managed-interactive-header";
import { ManagedInteractiveHint } from "./managed-interactive-hint";
import { ActivityLayouts, hasPluginThatRequiresHeader } from "../../../utilities/activity-utils";
import { useQuestionInfoContext } from "../../question-info-context";

import "./managed-interactive.scss";

interface IProps {
  embeddable: IManagedInteractive | IMwInteractive;
  questionNumber?: number;
  setSupportedFeatures: (container: HTMLElement, features: ISupportedFeatures) => void;
  setSendCustomMessage: (sender: (message: ICustomMessage) => void) => void;
  setNavigation?: (options: INavigationOptions) => void;
  ref?: React.Ref<ManagedInteractiveImperativeAPI>;
  emitInteractiveAvailable?: () => void;
  showQuestionPrefix: boolean;
  hideQuestionNumbers?: boolean;
}

export interface ManagedInteractiveImperativeAPI {
  requestInteractiveState: (options?: IGetInteractiveState) => Promise<void>;
}

export interface IClickToPlayOptions {
  prompt?: string | null;
  imageUrl?: string | null;
}

const getModalContainer = (): HTMLElement => {
  return document.getElementById("app") || document.body;
};

export const ManagedInteractive: React.ForwardRefExoticComponent<IProps> = forwardRef((props, ref) => {
  const { embeddable, questionNumber, setSupportedFeatures, setSendCustomMessage, setNavigation } = props;
  const { scrollToQuestionId } = useQuestionInfoContext();
  const portalData = useContext(PortalDataContext);
  const laraData = useContext(LaraDataContext);

  const [activeDialog, setActiveDialog] = useState<IShowDialog | null>(null);
  const [activeLightbox, setActiveLightbox] = useState<IShowLightbox | null>(null);
  const [ARFromSupportedFeatures, setARFromSupportedFeatures] = useState(0);
  const [clickedToPlay, setClickedToPlay] = useState(false);
  const [clickToPlayOptions, setClickToPlayOptions] = useState<IClickToPlayOptions|undefined>(undefined);
  const [feedback, setFeedback] = useState<QuestionFeedback | null>(null);
  const [hint, setHint] = useState("");
  const [heightFromInteractive, setHeightFromInteractive] = useState(0);
  const [screenHeight, setScreenHeight] = useState({dynamicHeight: window.innerHeight});
  const [showHint, setShowHint] = useState(false);
  const shouldWatchAnswer = isQuestion(props.embeddable, {ignoreHideQuestionNumber: true});
  const [loadingAnswer, setLoadingAnswer] = useState(shouldWatchAnswer);

  const iframeRuntimeRef = useRef<IframeRuntimeImperativeAPI>(null);
  const onSetInteractiveStateCallback = useRef<() => void>();
  const interactiveState = useRef<any>();
  const legacyLinkedInteractiveState = useRef<ILegacyLinkedInteractiveState | null>(null);
  const answerMeta = useRef<IExportableAnswerMetadata>();
  const shouldLoadLegacyLinkedInteractiveState = hasLegacyLinkedInteractive(props.embeddable, laraData);
  const [loadingLegacyLinkedInteractiveState, setLoadingLegacyLinkedInteractiveState] = useState(shouldLoadLegacyLinkedInteractiveState);
  const interactiveInfo = useRef<IInteractiveInfo | undefined>(undefined);
  const headerTarget = React.useRef(null);
  const divTarget = React.useRef<HTMLDivElement>(null);
  const divSize = useSize(divTarget);
  const headerSize = useSize(headerTarget);

  const embeddableRefId = embeddable.ref_id;

  const hasPluginRequiringHeader = useMemo(() => {
    return !!laraData.activity && hasPluginThatRequiresHeader(laraData.activity, embeddableRefId);
  }, [laraData.activity, embeddableRefId]);

  useEffect(() => {
    window.addEventListener("resize", () => setScreenHeight({dynamicHeight: window.innerHeight}));
    return(() => {
        window.removeEventListener("resize", () => setScreenHeight({dynamicHeight: window.innerHeight}));
    });
  }, []);

  const { proposedHeight, containerWidth } = useSizeAndAspectRatio({
    embeddable: props.embeddable,
    ARFromSupportedFeatures,
    heightFromInteractive,
    divSize,
    headerSize,
    screenHeight,
    showDeleteDataButton: false
  });

  useEffect(() => {
    if (scrollToQuestionId === embeddableRefId && divSize) {
      divTarget.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [embeddableRefId, divSize, scrollToQuestionId]);

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

  useEffect(() => {
    let unsubscribe = () => {/* no-op */};
    async function watchFeedback() {
      const answer = await getAnswerMetadata(embeddableRefId);
      if (answer?.id) {
        unsubscribe = watchQuestionLevelFeedback((fbs) => {
          if (fbs?.length) {
            const questionId = refIdToAnswersQuestionId(embeddableRefId);
            const fb = fbs.filter(f => f.questionId === questionId);
            fb.length && setFeedback(fb[0]);
          }
        }, answer.id);
      }
    }
    watchFeedback();

    return () => unsubscribe();
  }, [embeddableRefId]);

  // in older iframe interactive embeddables, we get url, native_width, native_height, etc. directly off
  // of the embeddable object. On newer managed/library interactives, this data is in library_interactive.data.
  const embeddableData = embeddable.type === "ManagedInteractive" ? embeddable.library_interactive?.data : embeddable;

  useEffect(() => {
    setClickToPlayOptions(embeddableData?.click_to_play
    ? ({
        prompt: embeddableData.click_to_play_prompt,
        imageUrl: embeddableData.image_url
      })
    : undefined);
  }, [embeddableData]);

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

  const getFirebaseJWT = useCallback((firebaseApp: string, others: Record<string, any>) => {
    return handleGetFirebaseJWT({ firebase_app: firebaseApp, ...others }, portalData);
  }, [portalData]);

  const { authored_state } = embeddable;
  const questionName = embeddable.name || "";
  const url = embeddableData?.base_url || embeddableData?.url || "";
  const authoredState = useMemo(() => safeJsonParseIfString(authored_state) || {}, [authored_state]);
  const linkedInteractives = useRef(embeddable.linked_interactives?.length
    ? embeddable.linked_interactives.map(link => ({ id: link.ref_id, label: link.label }))
    : undefined);

  const setShowDeleteDataButton = () => {
    return embeddable.type === "MwInteractive"
             && embeddable.enable_learner_state
             && embeddable.show_delete_data_button
           || embeddable.type === "ManagedInteractive"
             && embeddable.library_interactive?.data.enable_learner_state
             && embeddable.library_interactive.data.show_delete_data_button;
  };

  const showDeleteDataButton = setShowDeleteDataButton();

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
        interactiveId: embeddableRefId,
        onAnswerMetaUpdate: newMeta => {
          // don't allow writes over passed in interactiveId (for now, until it is needed and thought through...)
          if (!answerMeta.current && request.interactiveId && request.interactiveId !== embeddableRefId) {
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

  // question numbers are 1-based
  const hasQuestionNumber = (questionNumber || 0) > 0;
  const hasQuestionName = questionName.trim().length > 0;
  const isNotebookLayout = laraData.activity?.layout === ActivityLayouts.Notebook;
  const hideQuestionHeader = (props.hideQuestionNumbers || !hasQuestionNumber) && !hasQuestionName && !hint && !isNotebookLayout && !hasPluginRequiringHeader;

  const isInteractive = embeddable.type === "MwInteractive";
  const isManagedInteractive = embeddable.type === "ManagedInteractive";
  const hasBorder = isManagedInteractive || (isInteractive && !hideQuestionHeader);
  const className = classNames("runtime-container", {"has-question-number": hasQuestionNumber, "has-border": hasBorder});

  const interactiveIframeRuntime =
    loadingAnswer || loadingLegacyLinkedInteractiveState ?
      "Loading..." :
      <IframeRuntime
        ref={iframeRuntimeRef}
        url={iframeUrl}
        id={embeddableRefId}
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
        hasHeader={!hideQuestionHeader}
        feedback={feedback}
      />;

  return (
    <div ref={divTarget} className="managed-interactive" data-cy="managed-interactive">
      <div className={className} style={{width:containerWidth}}>
      <ManagedInteractiveHeader
        questionNumber={props.hideQuestionNumbers ? undefined : questionNumber}
        questionName={questionName}
        hint={hint}
        onToggleHint={handleShowHint}
        hideHeader={hideQuestionHeader}
      />
      <ManagedInteractiveHint
        hint={hint}
        showHint={showHint}
        onToggleHint={handleHintClose}
      />
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
