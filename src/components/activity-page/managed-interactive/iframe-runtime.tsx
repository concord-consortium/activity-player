// cf. https://github.com/concord-consortium/question-interactives/blob/master/src/scaffolded-question/components/iframe-runtime.tsx
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { IframePhone } from "../../../types";
import iframePhone from "iframe-phone";
import {
  ClientMessage, ICustomMessage, IGetFirebaseJwtRequest, IGetInteractiveSnapshotRequest,
  IGetInteractiveSnapshotResponse, IInitInteractive, ILinkedInteractive, IReportInitInteractive,
  ISupportedFeatures, ServerMessage, IShowModal, ICloseModal
} from "@concord-consortium/lara-interactive-api";
import Shutterbug from "shutterbug";

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
  ref?: React.Ref<IframeRuntimeImperativeAPI>;
}

export const IframeRuntime: React.FC<IProps> = forwardRef((props, ref) => {
  const { url, id, authoredState, initialInteractiveState, setInteractiveState, linkedInteractives, report,
    proposedHeight, containerWidth, setNewHint, getFirebaseJWT, showModal, closeModal, setSupportedFeatures,
    setSendCustomMessage } = props;
  const [ heightFromInteractive, setHeightFromInteractive ] = useState(0);
  const [ ARFromSupportedFeatures, setARFromSupportedFeatures ] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const phoneRef = useRef<IframePhone>();
  const setInteractiveStateRef = useRef<((state: any) => void)>(setInteractiveState);
  setInteractiveStateRef.current = setInteractiveState;
  const linkedInteractivesRef = useRef(linkedInteractives?.length ? { linkedInteractives } : { linkedInteractives: [] });

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
        if (info.features.aspectRatio) {
          setARFromSupportedFeatures(info.features.aspectRatio);
        }
        if (iframeRef.current) {
          setSupportedFeatures(iframeRef.current, info.features);
        }
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
      addListener("hint", (newHint: any) => {
        setNewHint(newHint.text || "");
      });
      addListener("showModal", (options: IShowModal) => {
        showModal(options);
      });
      addListener("closeModal", (options: ICloseModal) => {
        closeModal(options);
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
                    modalDialog: {
                      version: "1.0.0",
                      imageLightbox: false
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
  }, [url, authoredState, report, initialInteractiveState, setNewHint, getFirebaseJWT, setSupportedFeatures,
      setSendCustomMessage, showModal, closeModal]);

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
      <iframe ref={iframeRef} src={url} id={id} width="100%" height={height} frameBorder={0} />
    </div>
  );
});
IframeRuntime.displayName = "IframeRuntime";
