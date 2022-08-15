import { IEmbeddableRuntimeContext, IInteractiveState } from "../plugin-api";
import { onInteractiveAvailable, IInteractiveAvailableEvent, IInteractiveAvailableEventHandler,
        onInteractiveSupportedFeatures, IInteractiveSupportedFeaturesEvent, IInteractiveSupportedFeaturesEventHandler
        } from "../events";
import { ICustomMessage } from "@concord-consortium/lara-interactive-api";
import { IEmbeddableContextOptions } from "./plugin-context";
import { getReportUrl } from "../../utilities/report-utils";
import { createOrUpdateAnswer, getAnswer } from "../../firebase-db";
import { EmbeddableBase } from "../../types";
import { getAnswerWithMetadata } from "../../utilities/embeddable-utils";

const getInteractiveState = (interactiveStateUrl: string | null): Promise<IInteractiveState> | null => {
  if (!interactiveStateUrl) {
    return null;
  }
  return fetch(interactiveStateUrl, {method: "get", credentials: "include"}).then(resp => resp.json());
};

const getReportingUrl = (refId: string): Promise<string | null> | null => {
  return Promise.resolve(getReportUrl(refId));
};

const setAnswerSharedWithClass = (shared: boolean, embeddable: EmbeddableBase) => {
  return getAnswer(embeddable.ref_id).then(wrappedAnswer => {
    if (wrappedAnswer) {
      return createOrUpdateAnswer({...wrappedAnswer.meta, shared_with: shared ? "context" : null });
    }
    // This will happen when answer doc hasn't been created in the report service Firestore yet.
    // Usually, it means that user tries to share an interactive before providing any answer.
    const newAnswer = getAnswerWithMetadata(null, embeddable);
    return createOrUpdateAnswer({...newAnswer, shared_with: shared ? "context" : null });
  });
};

// returns true if the contextContainer is equal or is contained in eventContainer
// this is needed as click to play on an embeddable using the sharing plugin generates interativeAvailable
// events with the eventContainer set to the sharing plugin wrapper but the runtime context is generated
// using the wrapped interactive's container
const inContainerTree = (eventContainer: HTMLElement, contextContainer: HTMLElement): boolean => {
  let treeWalker: HTMLElement | null = contextContainer;
  while (treeWalker && (eventContainer !== treeWalker)) {
    treeWalker = treeWalker.parentElement;
  }
  return eventContainer === treeWalker;
};

export const generateEmbeddableRuntimeContext = (context: IEmbeddableContextOptions): IEmbeddableRuntimeContext => {
  return {
    container: context.container,
    laraJson: context.laraJson,
    getInteractiveState: () => getInteractiveState(context.interactiveStateUrl),
    getReportingUrl: () => getReportingUrl(context.laraJson.ref_id),
    onInteractiveAvailable: (handler: IInteractiveAvailableEventHandler) => {
      // Add generic listener and filter events to limit them just to this given embeddable.
      onInteractiveAvailable((event: IInteractiveAvailableEvent) => {
        if (inContainerTree(event.container, context.container)) {
          handler(event);
        }
      });
    },
    onInteractiveSupportedFeatures: (handler: IInteractiveSupportedFeaturesEventHandler) => {
      // Add generic listener and filter events to limit them just to this given embeddable.
      onInteractiveSupportedFeatures((event: IInteractiveSupportedFeaturesEvent) => {
        if (inContainerTree(event.container, context.container)) {
          handler(event);
        }
      });
    },
    interactiveAvailable: context.interactiveAvailable,
    sendCustomMessage: (message: ICustomMessage) => {
      context.sendCustomMessage?.(message);
    },
    setAnswerSharedWithClass: (shared: boolean) => setAnswerSharedWithClass(shared, context.laraJson)
  };
};
