import React, { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef }  from "react";
import classNames from "classnames";
import { TextBox } from "./text-box/text-box";
import { LaraGlobalContext } from "../lara-global-context";
import { ManagedInteractive, ManagedInteractiveImperativeAPI } from "./managed-interactive/managed-interactive";
import { ActivityLayouts, isNotVisibleEmbeddable } from "../../utilities/activity-utils";
import { EmbeddablePlugin } from "./plugins/embeddable-plugin";
import { initializePlugin, IPartialEmbeddablePluginContext, validateEmbeddablePluginContextForWrappedEmbeddable
        } from "../../utilities/plugin-utils";
import { EmbeddableType, IEmbeddablePlugin, ISpikeMediaLibraryItem } from "../../types";
import { IInteractiveSupportedFeaturesEvent } from "../../lara-plugin/events";
import { ICustomMessage, ISupportedFeatures, INavigationOptions, IGetInteractiveState } from "@concord-consortium/lara-interactive-api";
import { SpikeMediaLibrary } from "./spike-media-library/spike-media-library";

import "./embeddable.scss";

interface IProps {
  embeddable: EmbeddableType;
  linkedPluginEmbeddable?: IEmbeddablePlugin;
  sectionLayout: string;
  displayMode?: string;
  activityLayout?: number;
  questionNumber?: number;
  teacherEditionMode?: boolean;
  setNavigation?: (id: string, options: INavigationOptions) => void;
  pluginsLoaded: boolean;
  ref?: React.Ref<EmbeddableImperativeAPI>;
  spikeMediaLibrary?: ISpikeMediaLibraryItem[]
}

export interface EmbeddableImperativeAPI {
  requestInteractiveState: (options?: IGetInteractiveState) => Promise<void>;
}

type ISendCustomMessage = (message: ICustomMessage) => void;

export const Embeddable: React.ForwardRefExoticComponent<IProps> = forwardRef((props, ref) => {
  const { embeddable, sectionLayout, activityLayout, linkedPluginEmbeddable, displayMode, questionNumber, setNavigation, teacherEditionMode, pluginsLoaded, spikeMediaLibrary } = props;
  const handleSetNavigation = useCallback((options: INavigationOptions) => {
    setNavigation?.(embeddable.ref_id, options);
  }, [setNavigation, embeddable.ref_id]);
  const managedInteractiveRef = useRef<ManagedInteractiveImperativeAPI>(null);
  const embeddableWrapperDivTarget = useRef<HTMLInputElement>(null);
  const embeddableDivTarget = useRef<HTMLInputElement>(null);
  const targetDiv = useRef<HTMLDivElement>(null);
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
      sendCustomMessage
    };
    const validPluginContext = validateEmbeddablePluginContextForWrappedEmbeddable(pluginContext);
    if (validPluginContext && pluginsLoaded) {
      initializePlugin(validPluginContext);
    }
  }, [LARA, linkedPluginEmbeddable, embeddable, pluginsLoaded]);

  useImperativeHandle(ref, () => ({
    requestInteractiveState: (options?: IGetInteractiveState) => managedInteractiveRef.current?.requestInteractiveState(options) || Promise.resolve()
  }));

  const handleSetSupportedFeatures = useCallback((container: HTMLElement, features: ISupportedFeatures) => {
    const event: IInteractiveSupportedFeaturesEvent = {
      container,
      supportedFeatures: features
    };
    LARA?.Events.emitInteractiveSupportedFeatures(event);
  }, [LARA?.Events]);

  // used by ManagedInteractive when click to play is enabled to signal the interactive
  // is available after click to play is clicked
  const handleEmitInteractiveAvailable = useCallback(() => {
    const container = embeddableWrapperDivTarget.current;
    if (container) {
      LARA?.Events.emitInteractiveAvailable({ container, available: true });
    }
  }, [LARA?.Events]);

  const showQuestionPrefix = activityLayout !== ActivityLayouts.Notebook;

  let qComponent;
  if (embeddable.type === "MwInteractive" || (embeddable.type === "ManagedInteractive" && embeddable.library_interactive)) {
    qComponent = <ManagedInteractive
                    ref={managedInteractiveRef}
                    embeddable={embeddable}
                    questionNumber={questionNumber}
                    setSupportedFeatures={handleSetSupportedFeatures}
                    setSendCustomMessage={setSendCustomMessage}
                    setNavigation={handleSetNavigation}
                    emitInteractiveAvailable={handleEmitInteractiveAvailable}
                    showQuestionPrefix={showQuestionPrefix}
                 />;
  } else if (embeddable.type === "ManagedInteractive" && !embeddable.library_interactive) {
    qComponent = <div>Content type not supported</div>;
  } else if (embeddable.type === "Embeddable::EmbeddablePlugin" && embeddable.plugin?.component_label === "windowShade") {
    qComponent = teacherEditionMode ? <EmbeddablePlugin embeddable={embeddable} pluginsLoaded={pluginsLoaded} /> : undefined;
  } else if (embeddable.type === "Embeddable::Xhtml") {
    qComponent = <TextBox embeddable={embeddable} />;
  } else if (embeddable.type === "Embeddable::SpikeMediaLibrary") {
    qComponent = <SpikeMediaLibrary embeddable={embeddable} spikeMediaLibrary={spikeMediaLibrary} />;
  } else if (isNotVisibleEmbeddable(embeddable)) {
    qComponent = undefined;
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

  const singlePageLayout = activityLayout === ActivityLayouts.SinglePage;
  const isFullWidthLayout = sectionLayout === "full-width" || singlePageLayout;

  let hasMaxAspectRatio = false;

  if (embeddable.type === "ManagedInteractive" && !embeddable.inherit_aspect_ratio_method) {
    hasMaxAspectRatio = embeddable.custom_aspect_ratio_method === "MAX";
  } else if (embeddable.type === "ManagedInteractive" && embeddable.inherit_aspect_ratio_method) {
    hasMaxAspectRatio = embeddable.library_interactive?.data.aspect_ratio_method === "MAX";
  } else {
    hasMaxAspectRatio = embeddable.aspect_ratio_method === "MAX";
  }

  const embeddableClasses = classNames("embeddable",
                                        isFullWidthLayout
                                          ? "full-width"
                                          : embeddable.column === "primary"
                                            ? "primary"
                                            : displayMode === "stacked"
                                              ? "secondary stacked"
                                              : "secondary",
                                        {"half-width":  embeddable.is_half_width && !singlePageLayout},
                                        {"hidden": embeddable.is_hidden},
                                        {"max-aspect-ratio": isFullWidthLayout && hasMaxAspectRatio}
                                      );

  return (
    <div
      className={embeddableClasses}
      data-cy="embeddable"
      key={embeddable.ref_id}
      ref={targetDiv}
    >
      { linkedPluginEmbeddable && <div className={"embeddable-sub-one"} ref={embeddableWrapperDivTarget}></div> }
      <div className={"embeddable-sub-two"} ref={embeddableDivTarget}>
        { qComponent }
      </div>
    </div>
  );
});
Embeddable.displayName = "Embeddable";
