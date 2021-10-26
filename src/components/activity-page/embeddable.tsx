import React, { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef }  from "react";
import classNames from "classnames";
import useResizeObserver from "use-resize-observer";
import { TextBox } from "./text-box/text-box";
import { LaraGlobalContext } from "../lara-global-context";
import { ManagedInteractive, ManagedInteractiveImperativeAPI } from "./managed-interactive/managed-interactive";
import { ActivityLayouts } from "../../utilities/activity-utils";
import { EmbeddablePlugin } from "./plugins/embeddable-plugin";
import { initializePlugin, IPartialEmbeddablePluginContext, validateEmbeddablePluginContextForWrappedEmbeddable
        } from "../../utilities/plugin-utils";
import { EmbeddableWrapper, IEmbeddablePlugin } from "../../types";
import { IInteractiveSupportedFeaturesEvent } from "../../lara-plugin/events";
import { ICustomMessage, ISupportedFeatures, INavigationOptions } from "@concord-consortium/lara-interactive-api";

import "./embeddable.scss";

interface IProps {
  embeddableWrapper: EmbeddableWrapper;
  linkedPluginEmbeddable?: IEmbeddablePlugin;
  sectionLayout: string;
  displayMode?: string;
  activityLayout?: number;
  questionNumber?: number;
  teacherEditionMode?: boolean;
  setNavigation?: (id: string, options: INavigationOptions) => void;
  pluginsLoaded: boolean;
  embeddableRef?: React.Ref<EmbeddableImperativeAPI>;
  onSizeChange: () => void;
}

export interface EmbeddableImperativeAPI {
  requestInteractiveState: () => Promise<void>;
}

type ISendCustomMessage = (message: ICustomMessage) => void;

export const Embeddable: React.ForwardRefExoticComponent<IProps> = forwardRef((props, embeddableRef) => {
  const { embeddableWrapper, linkedPluginEmbeddable, activityLayout, displayMode, questionNumber, setNavigation, teacherEditionMode, pluginsLoaded, onSizeChange } = props;
  const handleSetNavigation = useCallback((options: INavigationOptions) => {
    setNavigation?.(embeddableWrapper.embeddable.ref_id, options);
  }, [setNavigation, embeddableWrapper.embeddable.ref_id]);
  const managedInteractiveRef = useRef<ManagedInteractiveImperativeAPI>(null);
  const embeddableWrapperDivTarget = useRef<HTMLInputElement>(null);
  const embeddableDivTarget = useRef<HTMLInputElement>(null);
  const sendCustomMessageRef = useRef<ISendCustomMessage | undefined>(undefined);
  const setSendCustomMessage = useCallback((sender: ISendCustomMessage) => {
    sendCustomMessageRef.current = sender;
  }, []);
  const LARA = useContext(LaraGlobalContext);
  const { ref } = useResizeObserver({
    onResize: () => {
      onSizeChange();
    }
  });
  useEffect(() => {
    const sendCustomMessage = (message: ICustomMessage) => sendCustomMessageRef.current?.(message);
    const pluginContext: IPartialEmbeddablePluginContext = {
      LARA,
      embeddable: linkedPluginEmbeddable,
      embeddableContainer: embeddableWrapperDivTarget.current || undefined,
      wrappedEmbeddable: embeddableWrapper.embeddable,
      wrappedEmbeddableContainer: embeddableDivTarget.current || undefined,
      sendCustomMessage
    };
    const validPluginContext = validateEmbeddablePluginContextForWrappedEmbeddable(pluginContext);
    if (validPluginContext && pluginsLoaded) {
      initializePlugin(validPluginContext);
    }
  }, [LARA, linkedPluginEmbeddable, embeddableWrapper.embeddable, pluginsLoaded]);

  useImperativeHandle(embeddableRef, () => ({
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
  if (embeddableWrapper.embeddable.type === "MwInteractive" || (embeddableWrapper.embeddable.type === "ManagedInteractive" && embeddableWrapper.embeddable.library_interactive)) {
    qComponent = <ManagedInteractive
                    ref={managedInteractiveRef}
                    embeddable={embeddableWrapper.embeddable}
                    questionNumber={questionNumber}
                    setSupportedFeatures={handleSetSupportedFeatures}
                    setSendCustomMessage={setSendCustomMessage}
                    setNavigation={handleSetNavigation} />;
  } else if (embeddableWrapper.embeddable.type === "Embeddable::EmbeddablePlugin"
              && (embeddableWrapper.embeddable.plugin?.component_label === "questionWrapper" || embeddableWrapper.embeddable.plugin?.component_label === "windowShade")) {
    qComponent = teacherEditionMode ? <EmbeddablePlugin embeddable={embeddableWrapper.embeddable} pluginsLoaded={pluginsLoaded} /> : undefined;
  } else if (embeddableWrapper.embeddable.type === "Embeddable::Xhtml") {
    qComponent = <TextBox embeddable={embeddableWrapper.embeddable} />;
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
  const isFullWidthLayout = embeddableWrapper.column === null || singlePageLayout;
  const embeddableClasses = classNames("embeddable",
                                        isFullWidthLayout
                                          ? "full-width"
                                          : embeddableWrapper.column === "primary"
                                            ? "primary"
                                            : displayMode === "stacked"
                                              ? "secondary stacked"
                                              : "secondary",
                                        {"half-width":  embeddableWrapper.embeddable.is_half_width}
                                      );

  return (
    <div
      className={embeddableClasses}
      data-cy="embeddable"
      key={embeddableWrapper.embeddable.ref_id}
      ref={ref}
    >
      { linkedPluginEmbeddable && <div ref={embeddableWrapperDivTarget}></div> }
      <div ref={embeddableDivTarget}>
        { qComponent }
      </div>
    </div>
  );
});
Embeddable.displayName = "Embeddable";
