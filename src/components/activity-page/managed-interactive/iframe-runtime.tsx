// cf. https://github.com/concord-consortium/question-interactives/blob/master/src/scaffolded-question/components/iframe-runtime.tsx
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { IframePhone } from "../../../types";
import iframePhone from "iframe-phone";
import {
  ClientMessage, ICustomMessage, IGetFirebaseJwtRequest, IGetInteractiveSnapshotRequest,
  IGetInteractiveSnapshotResponse, IInitInteractive, ILinkedInteractive, IReportInitInteractive,
  ISupportedFeatures, ServerMessage, IShowModal, ICloseModal, INavigationOptions, ILinkedInteractiveStateResponse,
  IAddLinkedInteractiveStateListenerRequest, IRemoveLinkedInteractiveStateListenerRequest, IDecoratedContentMessage
} from "@concord-consortium/lara-interactive-api";
import Shutterbug from "shutterbug";
import { Logger } from "../../../lib/logger";
import { watchAnswer } from "../../../firebase-db";
import { ITextDecorationInfo, IEventListener } from "../../../lara-plugin/plugin-api/decorate-content";

const kDefaultHeight = 300;

export interface IframeRuntimeImperativeAPI {
  requestInteractiveState: () => void;
}

interface IProps {
  url: string;
  id: string;
  authoredState: any;
  initialInteractiveState: any;
  setInteractiveState: (state: any) => void;
  setSupportedFeatures: (container: HTMLElement, features: ISupportedFeatures) => void;
  linkedInteractives?: ILinkedInteractive[];
  report?: boolean;
  proposedHeight?: number;
  containerWidth?: number;
  setNewHint: (newHint: string) => void;
  getFirebaseJWT: (firebaseApp: string, others: Record<string, any>) => Promise<string>;
  showModal: (options: IShowModal) => void;
  closeModal: (options: ICloseModal) => void;
  setSendCustomMessage: (sender: (message: ICustomMessage) => void) => void;
  setNavigation?: (options: INavigationOptions) => void;
  ref?: React.Ref<IframeRuntimeImperativeAPI>;
  textDecorationInfo?: ITextDecorationInfo;
}

export const IframeRuntime: React.ForwardRefExoticComponent<IProps> = forwardRef((props, ref) => {
  const { url, id, authoredState, initialInteractiveState, setInteractiveState, linkedInteractives, report,
    proposedHeight, containerWidth, setNewHint, getFirebaseJWT, showModal, closeModal, setSupportedFeatures,
    setSendCustomMessage, setNavigation, textDecorationInfo } = props;

  const [ heightFromInteractive, setHeightFromInteractive ] = useState(0);
  const [ ARFromSupportedFeatures, setARFromSupportedFeatures ] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<IframePhone>();
  const setInteractiveStateRef = useRef<((state: any) => void)>(setInteractiveState);
  setInteractiveStateRef.current = setInteractiveState;
  const linkedInteractivesRef = useRef(linkedInteractives?.length ? { linkedInteractives } : { linkedInteractives: [] });

  useEffect(() => {
    if (phoneRef.current && iframeRef) {
      const textDecorationMessage = JSON.parse(JSON.stringify(textDecorationInfo));
      phoneRef.current.post("decorateContent", textDecorationMessage);
    }
  }, [textDecorationInfo, iframeRef]);

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
        setInteractiveStateRef.current(newInteractiveState);
      });
      addListener("height", (newHeight: number) => {
        setHeightFromInteractive(newHeight);
      });
      addListener("supportedFeatures", (info: any) => {
        const features: ISupportedFeatures = info.features;
        if (features.aspectRatio) {
          setARFromSupportedFeatures(features.aspectRatio);
        }
        if (iframeRef.current) {
          setSupportedFeatures(iframeRef.current, features);
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
      addListener("selectDecoratedContent", (msg: IDecoratedContentMessage) => {
        if (textDecorationInfo && msg.type === "click") {
          if ("type" in textDecorationInfo.eventListeners && textDecorationInfo.eventListeners.type === "click") {
            textDecorationInfo.eventListeners.listener({ type: "click", text: msg.text });
          }
          if (Array.isArray(textDecorationInfo.eventListeners)) {
            textDecorationInfo.eventListeners.forEach((eventListener: IEventListener) => {
              if (eventListener.type === "click") {
                eventListener.listener({ type: "click", text: msg.text });
              }
            });
          }
        }
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
      // note: many of the values here are placeholders that require further
      // consideration to determine whether there are more appropriate values.
      const baseProps: Omit<IReportInitInteractive, "mode"> = {
        version: 1,
        authoredState,
        interactiveState: initialInteractiveState,
        themeInfo: {
          colors: {
              colorA: "",
              colorB: ""
          }
        }
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
                  hostFeatures: {
                    modal: {
                      version: "1.0.0",
                      lightbox: true,
                      dialog: true,
                      alert: false
                    },
                    getFirebaseJwt: {
                      version: "1.0.0"
                    }
                  },
                  globalInteractiveState: null,
                  interactiveStateUrl: "",
                  collaboratorUrls: null,
                  classInfoUrl: "",
                  interactive: {
                    id: 0,
                    name: ""
                  },
                  authInfo: {
                    provider: "",
                    loggedIn: false,
                    email: ""
                  },
                  ...linkedInteractivesRef.current
                };
      phone.post("initInteractive", initInteractiveMsg);
    };

    if (iframeRef.current) {
      // Reload the iframe.
      iframeRef.current.src = url;
      // Re-init interactive, this time using a new mode (report or runtime).
      phoneRef.current = new iframePhone.ParentEndpoint(iframeRef.current, initInteractive);
      setSendCustomMessage((message: ICustomMessage) => {
        phoneRef.current?.post(message.type, message.content);
      });
    }
    // Cleanup.
    return () => {
      if (phoneRef.current) {
        phoneRef.current.disconnect();
      }
    };
    // Re-running the effect reloads the iframe.
    // The _only_ time that's ever appropriate is when the url has changed.
  }, [url]);  // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    requestInteractiveState: () => phoneRef.current?.post("getInteractiveState")
  }));

  const heightFromSupportedFeatures = ARFromSupportedFeatures && containerWidth ? containerWidth / ARFromSupportedFeatures : 0;
  // There are several options for specifying the iframe height. Check if we have height specified by interactive (from IframePhone
  // "height" listener), height based on aspect ratio specified by interactive (from IframePhone "supportedFeatures" listener),
  // or height from container dimensions and embeddable specifications.
  const height = heightFromInteractive || heightFromSupportedFeatures || proposedHeight || kDefaultHeight;

  return (
    <div data-cy="iframe-runtime">
      <iframe ref={iframeRef} src={url} id={id} width="100%" height={height} frameBorder={0}
              allowFullScreen={true}
              allow="geolocation *; microphone *; camera *"
      />
    </div>
  );
});
IframeRuntime.displayName = "IframeRuntime";
