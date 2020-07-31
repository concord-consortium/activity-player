import React, { useState } from "react";
import { TextBox } from "./text-box/text-box";
import { ManagedInteractive } from "./managed-interactive/managed-interactive";
import { ActivityLayouts, PageLayouts } from "../../utilities/activity-utils";

import "./embeddable.scss";
import { EmbeddableWrapper } from "../../types";
import { interactiveStatePath, getCurrentDBValue } from "../../firebase-db";

interface IProps {
  activityLayout?: number;
  embeddableWrapper: EmbeddableWrapper;
  isPageIntroduction: boolean;
  pageLayout: string;
  questionNumber?: number;
}

export const Embeddable: React.FC<IProps> = (props) => {
  const { activityLayout, embeddableWrapper, isPageIntroduction, pageLayout, questionNumber } = props;
  const embeddable = embeddableWrapper.embeddable;

  const [initialInteractiveState, setInitialInteractiveState] = useState({});

  // A one-time grab of the initial user state. We don't currently support live-updating the embeddable
  // with new user state from the database.
  // Although the request to start watching the data happens in app.ts, we have to assume that the
  // initialInteractiveState may be delayed for network reasons, and so this listener may return after
  // if the embeddable has already loaded. In that case, the embeddble will rerender.
  getCurrentDBValue(interactiveStatePath(embeddable.ref_id), setInitialInteractiveState);

  let qComponent;
  if (embeddable.type === "MwInteractive" || embeddable.type === "ManagedInteractive") {
    qComponent = <ManagedInteractive embeddable={embeddable} initialInteractiveState={initialInteractiveState} questionNumber={questionNumber} />;
  } else {
    qComponent = <TextBox embeddable={embeddable} isPageIntroduction={isPageIntroduction} />;
  }

  const staticWidth = pageLayout === PageLayouts.FortySixty || pageLayout === PageLayouts.SixtyForty || pageLayout === PageLayouts.Responsive;
  const singlePageLayout = activityLayout === ActivityLayouts.SinglePage;
  return (
    <div className={`embeddable ${embeddableWrapper.embeddable.is_full_width || staticWidth || singlePageLayout ? "full-width" : "reduced-width"}`} data-cy="embeddable">
      { qComponent || <div>Content type not supported</div> }
    </div>
  );
};
