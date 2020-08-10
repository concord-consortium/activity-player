import React, { useRef, useEffect, useState }  from "react";
import { TextBox } from "./text-box/text-box";
import { ManagedInteractive } from "./managed-interactive/managed-interactive";
import { ActivityLayouts, PageLayouts } from "../../utilities/activity-utils";
import { EmbeddablePlugin } from "./plugins/embeddable-plugin";
import { initializePlugin } from "../../utilities/plugin-utils";
import { EmbeddableWrapper, IEmbeddablePlugin } from "../../types";
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

  const [loadedInitialInteractiveState, setLoadedInitialInteractiveState] = useState(false);
  const [initialInteractiveState, setInitialInteractiveState] = useState();
  const [answerMeta, setAnswerMeta] = useState();

  // `loadedInitialInteractiveState` will be set to true the moment our initial request for `answers` data
  // comes through, whether or not there is any particular initial state for this interactive.
  // Once this has happened, we won't be setting `initialInteractiveState` again, so we won't rerender.
  if (!loadedInitialInteractiveState) {

    // A one-time grab of the initial user state. We don't currently support live-updating the embeddable
    // with new user state from the database.
    // If the request is still pending, we will delay rendering the component. If we're not requesting data
    // from firestore, we will return instantly with no data.
    getCurrentDBValue(localAnswerPath(embeddable.ref_id)).then(wrappedAnswer => {
      if (wrappedAnswer) {
        setInitialInteractiveState(wrappedAnswer.interactiveState);
        setAnswerMeta(wrappedAnswer.meta);
      }
      setLoadedInitialInteractiveState(true);
    });

    return (
      <div>Loading...</div>
    );
  }

  let qComponent;
  if (embeddable.type === "MwInteractive" || embeddable.type === "ManagedInteractive") {
    qComponent = <ManagedInteractive embeddable={embeddable} initialInteractiveState={initialInteractiveState} questionNumber={questionNumber} initialAnswerMeta={answerMeta} />;
  } else if (embeddable.type === "Embeddable::EmbeddablePlugin" && embeddable.plugin?.component_label === "windowShade") {
    qComponent = teacherEditionMode ? <EmbeddablePlugin embeddable={embeddable} /> : undefined;
  } else if (embeddable.type === "Embeddable::Xhtml") {
    qComponent = <TextBox embeddable={embeddable} isPageIntroduction={isPageIntroduction} />;
  } else {
    qComponent = <div>Content type not supported</div>;
  }

  const staticWidth = pageLayout === PageLayouts.FortySixty || pageLayout === PageLayouts.SixtyForty || pageLayout === PageLayouts.Responsive;
  const singlePageLayout = activityLayout === ActivityLayouts.SinglePage;

  const embeddableWrapperDivTarget = useRef<HTMLInputElement>(null);
  const embeddableDivTarget = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (embeddableWrapperDivTarget.current && embeddableDivTarget.current && linkedPluginEmbeddable && teacherEditionMode) {
      initializePlugin(linkedPluginEmbeddable, embeddable, embeddableWrapperDivTarget.current, embeddableDivTarget.current);
    }
  }, [linkedPluginEmbeddable, embeddable]);

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
