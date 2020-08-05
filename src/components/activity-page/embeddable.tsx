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

  const [initialInteractiveState, setInitialInteractiveState] = useState();
  const [answerMeta, setAnswerMeta] = useState();

  // A one-time grab of the initial user state. We don't currently support live-updating the embeddable
  // with new user state from the database.
  // Although the request to start watching the data happens in app.ts, we have to assume that the
  // initialInteractiveState may be delayed for network reasons, and so this listener may return after
  // if the embeddable has already loaded. In that case, the embeddble will rerender.
  getCurrentDBValue(localAnswerPath(embeddable.ref_id), (wrappedAnswer) => {
    setInitialInteractiveState(wrappedAnswer.interactiveState);
    setAnswerMeta(wrappedAnswer.meta);
  });

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
