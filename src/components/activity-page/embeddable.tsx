import React, { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef }  from "react";
import { TextBox } from "./text-box/text-box";
import { LaraGlobalContext } from "../lara-global-context";
import { ManagedInteractive, ManagedInteractiveImperativeAPI } from "./managed-interactive/managed-interactive";
import { ActivityLayouts, PageLayouts, EmbeddableSections } from "../../utilities/activity-utils";
import { EmbeddablePlugin } from "./plugins/embeddable-plugin";
import { initializePlugin, IPartialEmbeddablePluginContext, validateEmbeddablePluginContextForWrappedEmbeddable
        } from "../../utilities/plugin-utils";
import { EmbeddableWrapper, IEmbeddablePlugin } from "../../types";
import { IInteractiveSupportedFeaturesEvent } from "../../lara-plugin/events";
import { ICustomMessage, ISupportedFeatures, INavigationOptions } from "@concord-consortium/lara-interactive-api";

import "./embeddable.scss";

interface IProps {
  activityLayout?: number;
  embeddableWrapper: EmbeddableWrapper;
  linkedPluginEmbeddable?: IEmbeddablePlugin;
  pageLayout: string;
  pageSection: string;
  questionNumber?: number;
  teacherEditionMode?: boolean;
  setNavigation?: (id: string, options: INavigationOptions) => void;
  pluginsLoaded: boolean;
  ref?: React.Ref<EmbeddableImperativeAPI>;
}

export interface EmbeddableImperativeAPI {
  requestInteractiveState: () => Promise<void>;
}

type ISendCustomMessage = (message: ICustomMessage) => void;

export const Embeddable: React.ForwardRefExoticComponent<IProps> = forwardRef((props, ref) => {
  const { activityLayout, embeddableWrapper, linkedPluginEmbeddable, pageLayout, pageSection, questionNumber, setNavigation, teacherEditionMode, pluginsLoaded } = props;
  const embeddable = embeddableWrapper.embeddable;
  const handleSetNavigation = useCallback((options: INavigationOptions) => {
    setNavigation?.(embeddable.ref_id, options);
  }, [setNavigation, embeddable.ref_id]);
  const managedInteractiveRef = useRef<ManagedInteractiveImperativeAPI>(null);
  const embeddableWrapperDivTarget = useRef<HTMLInputElement>(null);
  const embeddableDivTarget = useRef<HTMLInputElement>(null);
  const sendCustomMessageRef = useRef<ISendCustomMessage | undefined>(undefined);
  const setSendCustomMessage = useCallback((sender: ISendCustomMessage) => {
    sendCustomMessageRef.current = sender;
  }, []);
  const LARA = useContext(LaraGlobalContext);
  useEffect(() => {
    const sendCustomMessage = (message: ICustomMessage) => sendCustomMessageRef.current?.(message);
    const pluginContext: IPartialEmbeddablePluginContext = {
      LARA,
      embeddable: linkedPluginEmbeddable,
      embeddableContainer: embeddableWrapperDivTarget.current || undefined,
      wrappedEmbeddable: embeddable,
      wrappedEmbeddableContainer: embeddableDivTarget.current || undefined,
      sendCustomMessage,
      approvedScriptLabel: "teacherEditionTips"
    };
    const validPluginContext = validateEmbeddablePluginContextForWrappedEmbeddable(pluginContext);
    if (validPluginContext && teacherEditionMode && pluginsLoaded) {
      initializePlugin(validPluginContext);
    }
  }, [LARA, linkedPluginEmbeddable, embeddable, teacherEditionMode, pluginsLoaded]);

  useImperativeHandle(ref, () => ({
    requestInteractiveState: () => {
      return managedInteractiveRef.current?.requestInteractiveState() || Promise.resolve();
    }
  }));

  const handleSetSupportedFeatures = useCallback((container: HTMLElement, features: ISupportedFeatures) => {
    const event: IInteractiveSupportedFeaturesEvent = {
      container,
      supportedFeatures: features
    };
    LARA?.Events.emitInteractiveSupportedFeatures(event);
  }, [LARA?.Events]);

  let qComponent;
  if (embeddable.type === "MwInteractive" || (embeddable.type === "ManagedInteractive" && embeddable.library_interactive)) {
    qComponent = <ManagedInteractive
                    ref={managedInteractiveRef}
                    embeddable={embeddable}
                    questionNumber={questionNumber}
                    setSupportedFeatures={handleSetSupportedFeatures}
                    setSendCustomMessage={setSendCustomMessage}
                    setNavigation={handleSetNavigation} />;
  } else if (embeddable.type === "Embeddable::EmbeddablePlugin" && embeddable.plugin?.component_label === "windowShade") {
    qComponent = teacherEditionMode ? <EmbeddablePlugin embeddable={embeddable} pluginsLoaded={pluginsLoaded} /> : undefined;
  } else if (embeddable.type === "Embeddable::Xhtml") {
    qComponent = <TextBox embeddable={embeddable} />;
  } else {
    qComponent = <div>Content type not supported</div>;
  }

  // The following conditional prevents teacher edition containers from being rendered 
  // when not in teacher edition mode. LARA handles this differently by using a mutation observer 
  // (see https://github.com/concord-consortium/lara/blob/master/app/views/plugins/_show.haml). 
  // It would be better to do that here as well if we update Activity Player to not use direct 
  // dependencies on teacherEditionMode.
  if (qComponent === undefined) {
    return null;
  }

  const fillContainerWidth = pageSection !== EmbeddableSections.Introduction &&
                             (pageLayout === PageLayouts.FortySixty ||
                              pageLayout === PageLayouts.SixtyForty ||
                              pageLayout === PageLayouts.Responsive);
  const singlePageLayout = activityLayout === ActivityLayouts.SinglePage;

  return (
    <div
      className={`embeddable ${embeddableWrapper.embeddable.is_full_width || fillContainerWidth || singlePageLayout ? "full-width" : "reduced-width"}`}
      data-cy="embeddable"
      key={embeddableWrapper.embeddable.ref_id}
    >
      { linkedPluginEmbeddable && <div ref={embeddableWrapperDivTarget}></div> }
      <div ref={embeddableDivTarget}>
        { qComponent }
      </div>
    </div>
  );
});
Embeddable.displayName = "Embeddable";
