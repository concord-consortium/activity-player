import React, { useRef, useEffect, useState }  from "react";
import { TextBox } from "./text-box/text-box";
import { ManagedInteractive } from "./managed-interactive/managed-interactive";
import { ActivityLayouts, PageLayouts } from "../../utilities/activity-utils";
import { EmbeddablePlugin } from "./plugins/embeddable-plugin";
import { initializePlugin } from "../../utilities/plugin-utils";
import { EmbeddableWrapper, IEmbeddablePlugin, IExportableAnswerMetadata } from "../../types";
import { localAnswerPath, getCurrentDBValue } from "../../firebase-db";

import "./embeddable.scss";

interface IProps {
  activityLayout?: number;
  embeddableWrapper: EmbeddableWrapper;
  isPageIntroduction: boolean;
  linkedPluginEmbeddable?: IEmbeddablePlugin;
  pageLayout: string;
  questionNumber?: number;
  teacherEditionMode?: boolean;
}

export const Embeddable: React.FC<IProps> = (props) => {
  const { activityLayout, embeddableWrapper, isPageIntroduction, linkedPluginEmbeddable, pageLayout, questionNumber, teacherEditionMode } = props;
  const embeddable = embeddableWrapper.embeddable;

  interface InitialInteractiveState {
    state?: any;
    answerMeta?: IExportableAnswerMetadata;
    loaded: boolean;
  }

  const [initialInteractiveState, setInitialInteractiveState] = useState({
    loaded: false
  } as InitialInteractiveState);


  const embeddableWrapperDivTarget = useRef<HTMLInputElement>(null);
  const embeddableDivTarget = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (embeddableWrapperDivTarget.current && embeddableDivTarget.current && linkedPluginEmbeddable && teacherEditionMode) {
      initializePlugin(linkedPluginEmbeddable, embeddable, embeddableWrapperDivTarget.current, embeddableDivTarget.current);
    }
  }, [linkedPluginEmbeddable, embeddable, initialInteractiveState, teacherEditionMode]);

  // `initialInteractiveState.loaded` will be set to true the moment our initial request for `answers` data
  // comes through, whether or not there is any particular initial state for this interactive.
  // Once this has happened, we won't be setting `initialInteractiveState` again, so we won't rerender.
  if (!initialInteractiveState.loaded) {

    // A one-time grab of the initial user state. We don't currently support live-updating the embeddable
    // with new user state from the database.
    // If the request is still pending, we will delay rendering the component. If we're not requesting data
    // from firestore, we will return instantly with no data.
    getCurrentDBValue(localAnswerPath(embeddable.ref_id)).then(wrappedAnswer => {
      const newInitialInteractiveState: InitialInteractiveState = {
        loaded: true
      };
      if (wrappedAnswer) {
        newInitialInteractiveState.state = wrappedAnswer.interactiveState;
        newInitialInteractiveState.answerMeta = wrappedAnswer.meta;
      }
      setInitialInteractiveState(newInitialInteractiveState);
    });
    return (
      <div key={embeddableWrapper.embeddable.ref_id}>Loading...</div>
    );
  }

  let qComponent;
  if (embeddable.type === "MwInteractive" || (embeddable.type === "ManagedInteractive" && embeddable.library_interactive)) {
    qComponent = <ManagedInteractive embeddable={embeddable} initialInteractiveState={initialInteractiveState.state} questionNumber={questionNumber} initialAnswerMeta={initialInteractiveState.answerMeta} />;
  } else if (embeddable.type === "Embeddable::EmbeddablePlugin" && embeddable.plugin?.component_label === "windowShade") {
    qComponent = teacherEditionMode ? <EmbeddablePlugin embeddable={embeddable} /> : undefined;
  } else if (embeddable.type === "Embeddable::Xhtml") {
    qComponent = <TextBox embeddable={embeddable} isPageIntroduction={isPageIntroduction} />;
  } else {
    qComponent = <div>Content type not supported</div>;
  }

  const staticWidth = pageLayout === PageLayouts.FortySixty || pageLayout === PageLayouts.SixtyForty || pageLayout === PageLayouts.Responsive;
  const singlePageLayout = activityLayout === ActivityLayouts.SinglePage;

  return (
    <div
      className={`embeddable ${embeddableWrapper.embeddable.is_full_width || staticWidth || singlePageLayout ? "full-width" : "reduced-width"}`}
      data-cy="embeddable"
      key={embeddableWrapper.embeddable.ref_id}
    >
      { linkedPluginEmbeddable && <div ref={embeddableWrapperDivTarget}></div> }
      <div ref={embeddableDivTarget}>
        { qComponent }
      </div>
    </div>
  );
};
