// cf. https://github.com/concord-consortium/question-interactives/blob/master/src/scaffolded-question/components/iframe-runtime.tsx
import { autorun } from "mobx";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { IExportableAnswerMetadata, IframePhone, ILegacyLinkedInteractiveState, QuestionFeedback } from "../../../types";
import iframePhone from "iframe-phone";
import {
  ClientMessage, ICustomMessage, IGetFirebaseJwtRequest, IGetInteractiveSnapshotRequest,
  IGetInteractiveSnapshotResponse, IInitInteractive, ILinkedInteractive, IReportInitInteractive,
  ISupportedFeatures, ServerMessage, IShowModal, ICloseModal, INavigationOptions, ILinkedInteractiveStateResponse,
  IAddLinkedInteractiveStateListenerRequest, IRemoveLinkedInteractiveStateListenerRequest, IDecoratedContentEvent,
  ITextDecorationInfo, ITextDecorationHandlerInfo, IAttachmentUrlRequest, IAttachmentUrlResponse, IGetInteractiveState, AttachmentInfoMap
} from "@concord-consortium/lara-interactive-api";
import { DynamicTextCustomMessageType, DynamicTextMessage, useDynamicTextContext } from "@concord-consortium/dynamic-text";
import Shutterbug from "shutterbug";
import { Logger } from "../../../lib/logger";
import { watchAnswer } from "../../../firebase-db";
import { IEventListener, pluginInfo } from "../../../lara-plugin/plugin-api/decorate-content";
import { IPortalData } from "../../../portal-types";
import { IInteractiveInfo } from "../../../utilities/embeddable-utils";
import { getReportUrl } from "../../../utilities/report-utils";
import ReloadIcon from "../../../assets/svg-icons/icon-reload.svg";
import { accessibilityClick } from "../../../utilities/accessibility-helper";
import { useAccessibility } from "../../accessibility-context";
import { useMediaLibrary } from "../../media-library-context";
import { IframeRuntimeFeedback } from "../../teacher-feedback/iframe-runtime-feedback";
import { isOfferingLocked } from "../../../utilities/portal-data-utils";

import "./iframe-runtime.scss";

const kDefaultHeight = 300;
const kInteractiveStateRequestTimeout = 20000; // ms

const getListenerTypes = (textDecorationHandlerInfo: ITextDecorationHandlerInfo): Array<{type: string}> => {
  const { eventListeners } = textDecorationHandlerInfo;
  if (eventListeners instanceof Array) {
    return eventListeners.map(listener => ({type: listener.type}));
  }
  return [{type: eventListeners.type}];
};

const createTextDecorationInfo = () => {
  const { textDecorationHandlerInfo } = pluginInfo;
  const listenerTypes = getListenerTypes(textDecorationHandlerInfo);
  const textDecorationInfo: ITextDecorationInfo = {
    words: textDecorationHandlerInfo.words.slice(),
    replace: textDecorationHandlerInfo.replace,
    wordClass: textDecorationHandlerInfo.wordClass,
    listenerTypes
  };
  return textDecorationInfo;
};

export interface IframeRuntimeImperativeAPI {
  requestInteractiveState: (options?: IGetInteractiveState) => Promise<void>;
}

interface IProps {
  url: string;
  id: string;
  authoredState: any;
  initialInteractiveState: any;
  legacyLinkedInteractiveState: ILegacyLinkedInteractiveState | null;
  setInteractiveState: (state: any) => void;
  setSupportedFeatures: (container: HTMLElement, features: ISupportedFeatures) => void;
  linkedInteractives?: ILinkedInteractive[];
  report?: boolean;
  proposedHeight?: number;
  containerWidth?: number | string;
  setNewHint: (newHint: string) => void;
  getFirebaseJWT: (firebaseApp: string, others: Record<string, any>) => Promise<string>;
  getAttachmentUrl: (request: IAttachmentUrlRequest) => Promise<IAttachmentUrlResponse>;
  showModal: (options: IShowModal) => void;
  closeModal: (options: ICloseModal) => void;
  setSendCustomMessage: (sender: (message: ICustomMessage) => void) => void;
  setNavigation?: (options: INavigationOptions) => void;
  ref?: React.Ref<IframeRuntimeImperativeAPI>;
  iframeTitle: string;
  portalData?: IPortalData;
  answerMetadata?: IExportableAnswerMetadata;
  interactiveInfo?: IInteractiveInfo;
  showDeleteDataButton?: boolean;
  setAspectRatio: (aspectRatio: number) => void;
  setHeightFromInteractive: (heightFromInteractive: number) => void;
  hasHeader?: boolean;
  feedback?: QuestionFeedback | null;
}

export const IframeRuntime: React.ForwardRefExoticComponent<IProps> = forwardRef((props, ref) => {
  const { url, id, authoredState, initialInteractiveState, legacyLinkedInteractiveState, setInteractiveState, linkedInteractives, report,
    proposedHeight, containerWidth, setNewHint, getFirebaseJWT, getAttachmentUrl, showModal, closeModal, setSupportedFeatures,
    setSendCustomMessage, setNavigation, iframeTitle, portalData, answerMetadata, interactiveInfo,
    showDeleteDataButton, setAspectRatio, setHeightFromInteractive, feedback } = props;

  const [reloadCount, setReloadCount] = useState<number>(0);
  const iframePhoneTimeout = useRef<number|undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<IframePhone>();
  const setInteractiveStateRef = useRef<((state: any) => void)>(setInteractiveState);
  setInteractiveStateRef.current = setInteractiveState;
  const interactiveStateRef = useRef(initialInteractiveState);
  const linkedInteractivesRef = useRef(linkedInteractives?.length ? { linkedInteractives } : { linkedInteractives: [] });
  const interactiveStateRequest = {
    promise: useRef<Promise<void>>(),
    resolveAndCleanup: useRef<() => void>(),
  };
  const currentInteractiveState = useRef<any>(initialInteractiveState);

  const dynamicText = useDynamicTextContext();
  const dynamicTextComponentIds = useRef<Set<string>>(new Set());

  const {fontSize, fontSizeInPx, fontType, fontFamilyForType} = useAccessibility();

  const mediaLibrary = useMediaLibrary();

  useEffect(() => {
    const initInteractive = () => {
      const phone = phoneRef.current;
      if (!phone) {
        return;
      }

      // Just to add some type checking to phone post (ServerMessage).
      const post = (type: ServerMessage, data: any) => phone.post(type, data);
      const addListener = (type: ClientMessage, handler: any) => phone.addListener(type, handler);

      addListener("interactiveState", (newInteractiveState: any) => {
        // "nochange" and "touch" are special messages supported by LARA. We don't want to save them.
        // newInteractiveState might be undefined if interactive state is requested before any state update.
        if (newInteractiveState !== undefined && newInteractiveState !== "nochange" && newInteractiveState !== "touch") {
          // only update interactive state if it's different from the current one to avoid updating the timestamp
          // used when comparing linked interactive states
          const interactiveStateChanged = JSON.stringify(currentInteractiveState.current) !== JSON.stringify(newInteractiveState);
          if (interactiveStateChanged) {
            currentInteractiveState.current = newInteractiveState;
            setInteractiveStateRef.current(newInteractiveState);
          }
        }
        if (currentInteractiveState.current !== undefined && newInteractiveState === "touch") {
          // save the current interactive state with a new timestamp
          setInteractiveStateRef.current(currentInteractiveState.current);
        }
        if (interactiveStateRequest.promise.current) {
          interactiveStateRequest.resolveAndCleanup.current?.();
        }
      });
      addListener("height", (newHeight: number) => {
        setHeightFromInteractive(newHeight);
      });
      addListener("supportedFeatures", (info: any) => {
        const features: ISupportedFeatures = info.features;
        if (features.aspectRatio) {
          setAspectRatio(features.aspectRatio);
        }
        if (iframeRef.current) {
          setSupportedFeatures(iframeRef.current, features);
        }
        if (phoneRef.current && pluginInfo.textDecorationHandlerInfo) {
          const textDecorationInfo: ITextDecorationInfo = createTextDecorationInfo();
          phoneRef.current.post("decorateContent", textDecorationInfo);
        }
      });
      addListener("navigation", (options: INavigationOptions) => {
        setNavigation?.(options);
      });
      addListener("getFirebaseJWT", async (request: IGetFirebaseJwtRequest) => {
        const { requestId, firebase_app, ...others } = request || {};
        let errorMessage = "Error retrieving Firebase JWT!";
        try {
          const rawFirebaseJWT = await getFirebaseJWT(firebase_app, others);
          post("firebaseJWT", { requestId, token: rawFirebaseJWT });
          errorMessage = "";
        }
        catch(e) {
          errorMessage = e.toString();
        }
        if (errorMessage) {
          post("firebaseJWT", { requestId, response_type: "ERROR", message: errorMessage });
        }
      });
      addListener("getInteractiveSnapshot", ({ requestId, interactiveItemId }: IGetInteractiveSnapshotRequest) => {
        Shutterbug.snapshot({
          selector: `#${interactiveItemId}`,
          done: (snapshotUrl: string) => {
            const response: IGetInteractiveSnapshotResponse = {
              requestId,
              snapshotUrl,
              success: true
            };
            post("interactiveSnapshot", response);
          },
          fail: (jqXHR: any, textStatus: any, errorThrown: any) => {
            console.error("Snapshot request failed: ", textStatus, errorThrown);
            const response: IGetInteractiveSnapshotResponse = {
              requestId,
              success: false
            };
            post("interactiveSnapshot", response);
          }
        });
      });
      const unsubscribeLinkedInteractiveStateListener = new Map();
      addListener("addLinkedInteractiveStateListener", (request: IAddLinkedInteractiveStateListenerRequest) => {
        const { interactiveItemId, listenerId } = request;
        const unsubscribe = watchAnswer(interactiveItemId, (wrappedAnswer) => {
          const interactiveState = wrappedAnswer?.interactiveState;
          const response: ILinkedInteractiveStateResponse<any> = {
            listenerId,
            interactiveState
          };
          post("linkedInteractiveState", response);
        });
        unsubscribeLinkedInteractiveStateListener.set(listenerId, unsubscribe);
      });
      addListener("removeLinkedInteractiveStateListener", (request: IRemoveLinkedInteractiveStateListenerRequest) => {
        const { listenerId } = request;
        const unsubscribe = unsubscribeLinkedInteractiveStateListener.get(listenerId);
        if (unsubscribe) {
          unsubscribe();
          unsubscribeLinkedInteractiveStateListener.delete(listenerId);
        }
      });
      addListener("hint", (newHint: any) => {
        setNewHint(newHint.text || "");
      });
      addListener("decoratedContentEvent", (msg: IDecoratedContentEvent) => {
        const { textDecorationHandlerInfo } = pluginInfo;
        if (textDecorationHandlerInfo) {
          const listeners = Array.isArray(textDecorationHandlerInfo.eventListeners)
            ? textDecorationHandlerInfo.eventListeners
            : [textDecorationHandlerInfo.eventListeners];
          listeners.forEach((eventListener: IEventListener) => {
            if (eventListener.type === msg.type) {
              eventListener.listener(msg);
            }
          });
        }
      });
      addListener("getAttachmentUrl", async (request: IAttachmentUrlRequest) => {
        const response = await getAttachmentUrl(request);
        post("attachmentUrl", response);
      });
      addListener("showModal", (options: IShowModal) => {
        showModal(options);
      });
      addListener("closeModal", (options: ICloseModal) => {
        closeModal(options);
      });
      addListener("log", (logData: any) => {
        Logger.log({
          event: logData.action,
          event_value: logData.value,
          parameters: logData.data,
          interactive_id: id,
          interactive_url: url
        });
      });
      addListener("customMessage", (message: ICustomMessage) => {
        if (message.type === DynamicTextCustomMessageType) {
          const content = message.content as DynamicTextMessage;
          switch (content.type) {
            case "select":
              // content.options my be undefined so it needs to be cast as any
              dynamicText.selectComponent(content.id, {...(content.options as any), extraLoggingInfo: {
                interactive_id: id,
                interactive_url: url
              }});
              break;
            case "register":
              // track locally so we can unregister when the iframe unloads
              dynamicTextComponentIds.current?.add(content.id);
              dynamicText.registerComponent(content.id, (componentMessage) => {
                post("customMessage", {type: DynamicTextCustomMessageType, content: componentMessage});
              });
              break;
            case "unregister":
              dynamicTextComponentIds.current?.delete(content.id);
              dynamicText.unregisterComponent(content.id);
              break;
          }
        }
      });

      // Legacy bug fix: In the 1.0.0 release of the AP the special 'nochange'
      // message wasn't handled correctly and it was saved as the interactive state
      // If we see that here we just use undefined instead. The problem is that
      // sending this state to interactives that don't expect it, will have JSON
      // parse errors trying to parse "nochange"
      if (interactiveStateRef.current === "nochange") {
        interactiveStateRef.current = undefined;
      }

      // create attachments map
      const attachments: AttachmentInfoMap = {};
      Object.keys(answerMetadata?.attachments || {}).forEach((key) => {
        const attachment = answerMetadata?.attachments?.[key];
        if (attachment) {
          attachments[key] = {
            contentType: attachment.contentType
          };
        }
      });

      // note: many of the values here are placeholders that require further
      // consideration to determine whether there are more appropriate values.
      // NOTE: updatedAt is directly added here instead of in the exported lara types
      const baseProps: Omit<IReportInitInteractive, "mode"> = {
        version: 1,
        hostFeatures: {
          modal: {
            version: "1.0.0",
            lightbox: true,
            dialog: true,
            alert: false
          },
          getFirebaseJwt: {
            version: "1.0.0"
          },
          domain: window.location.hostname
        },
        authoredState,
        interactiveState: interactiveStateRef.current,
        themeInfo: {
          colors: {
            colorA: "",
            colorB: ""
          }
        },
        ...linkedInteractivesRef.current,
        attachments
      };
      const initInteractiveMsg: IInitInteractive = report
              ? {
                  ...baseProps,
                  mode: "report"
                }
              : {
                  ...baseProps,
                  error: "",
                  mode: "runtime",
                  globalInteractiveState: null,
                  interactiveStateUrl: "",
                  collaboratorUrls: null,
                  classInfoUrl: portalData?.portalJWT?.class_info_url ?? "",
                  interactive: {
                    id,
                    name: ""
                  },
                  authInfo: {
                    provider: "",
                    loggedIn: !!portalData?.platformUserId,
                    email: ""
                  },
                  runRemoteEndpoint: portalData?.runRemoteEndpoint,
                  ...linkedInteractivesRef.current,
                  ...(legacyLinkedInteractiveState || {}),
                  pageName:  interactiveInfo?.pageName,
                  pageNumber: interactiveInfo?.pageNumber,
                  activityName: interactiveInfo?.activityName,
                  updatedAt: answerMetadata?.created,
                  externalReportUrl: getReportUrl(id) || undefined,
                  accessibility: {
                    fontSize,
                    fontSizeInPx,
                    fontType,
                    fontFamilyForType,
                  },
                  mediaLibrary
                };

      // to support legacy interactives first post the deprecated loadInteractive message as LARA does
      // but only when there is initialInteractiveState (also as LARA does)
      if (initialInteractiveState) {
        phone.post("loadInteractive", initialInteractiveState);
      }
      phone.post("initInteractive", initInteractiveMsg);
    };

    if (iframeRef.current) {
      // Reload the iframe.
      iframeRef.current.src = url;
      // Re-init interactive, this time using a new mode (report or runtime).
      phoneRef.current = new iframePhone.ParentEndpoint(iframeRef.current, initInteractive);
      setSendCustomMessage((message: ICustomMessage) => {
        phoneRef.current?.post("customMessage", message);
      });
    }

    // Cleanup.
    return () => {
      // Unregister all components that were proxied through this iframe handler so
      // we don't leave dangling registered components and so the current component is
      // silenced if it is being read when the iframe unloads
      // disable warning about dynamicTextComponentIds as it is not referencing a DOM node
      // eslint-disable-next-line react-hooks/exhaustive-deps
      dynamicTextComponentIds.current?.forEach(componentId => {
        dynamicText.unregisterComponent(componentId);
      });

      if (phoneRef.current) {
        phoneRef.current.disconnect();
      }
    };
    // Re-running the effect reloads the iframe.
    // The _only_ time that's ever appropriate is when the url has changed.
  }, [reloadCount, url]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return autorun(() => {
      if (phoneRef.current && pluginInfo.textDecorationHandlerInfo) {
        const textDecorationInfo: ITextDecorationInfo = createTextDecorationInfo();
        phoneRef.current.post?.("decorateContent", textDecorationInfo);
      }
    });
  }, []);

  useImperativeHandle(ref, () => ({
    requestInteractiveState: (options?: IGetInteractiveState) => {
      if (!interactiveStateRequest.promise.current) {
        phoneRef.current?.post("getInteractiveState", options);
        interactiveStateRequest.promise.current = new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            interactiveStateRequest.promise.current = undefined;
            interactiveStateRequest.resolveAndCleanup.current = undefined;
          };
          interactiveStateRequest.resolveAndCleanup.current = () => {
            resolve();
            cleanup();
          };
          iframePhoneTimeout.current = window.setTimeout(() => {
              if (interactiveStateRequest.promise.current) {
                const msg = `Sorry. Some items on this page did not save (${iframeTitle}).`;
                console.error(msg);
                reject(msg);
                cleanup();
              }
            }, kInteractiveStateRequestTimeout);
          });
      }
      return interactiveStateRequest.promise.current;
    }
  }));

  const handleResetButtonClick = (event: any) => {
    if (accessibilityClick(event) && confirm("Are you sure you want to clear your work and start over on this item?")) {
      if (iframePhoneTimeout.current) {
        clearTimeout(iframePhoneTimeout.current);
        iframePhoneTimeout.current = undefined;
      }
      phoneRef.current?.disconnect();
      setInteractiveStateRef.current(null);
      setInteractiveState(null);
      interactiveStateRef.current = undefined;
      // incrementing reloadCount modifies the iframe's key, causing the iframe to reload.
      setReloadCount(reloadCount + 1);
    }
  };

  const height = proposedHeight || kDefaultHeight;
  const width = containerWidth || "100%";
  const locked = isOfferingLocked(portalData);

  return (
    <div className="iframe-runtime" data-cy="iframe-runtime">
      <iframe
        className={locked ? "iframe-runtime-locked" : ""}
        tabIndex={locked ? -1 : 0}
        key={`${id}-${reloadCount}`}
        ref={iframeRef}
        src={url}
        id={id}
        width={width}
        height={height}
        allowFullScreen={true}
        allow="geolocation; microphone; camera; bluetooth; clipboard-read; clipboard-write"
        title={iframeTitle}
        scrolling="no"
      />
      <div className="iframe-runtime-buttons">
        {showDeleteDataButton &&
          <button className="button reset" data-cy="reset-button" onClick={handleResetButtonClick} onKeyDown={handleResetButtonClick}>
            Clear &amp; start over
            <ReloadIcon />
          </button>
        }
        {feedback && <IframeRuntimeFeedback embeddableRefId={id} feedback={feedback} />}
      </div>
    </div>
  );
});
IframeRuntime.displayName = "IframeRuntime";
