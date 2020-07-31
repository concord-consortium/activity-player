import React from "react";
import { TextBox } from "./text-box/text-box";
import { ManagedInteractive } from "./managed-interactive/managed-interactive";
import { ActivityLayouts, PageLayouts } from "../../utilities/activity-utils";

import "./embeddable.scss";
import { EmbeddableWrapper } from "../../types";

interface IProps {
  activityLayout?: number;
  embeddableWrapper: EmbeddableWrapper;
  isPageIntroduction: boolean;
  pageLayout: string;
  questionNumber?: number;
}

export const Embeddable: React.FC<IProps> = (props) => {
  const { activityLayout, embeddableWrapper, isPageIntroduction, pageLayout, questionNumber } = props;
  const EmbeddableComponent = {
    "MwInteractive": ManagedInteractive,
    "ManagedInteractive": ManagedInteractive,
    "Embeddable::Xhtml": TextBox,
  };
  const type = embeddableWrapper.embeddable.type;
  const QComponent = embeddableWrapper ? EmbeddableComponent[type] : undefined;
  const staticWidth = pageLayout === PageLayouts.FortySixty || pageLayout === PageLayouts.SixtyForty || pageLayout === PageLayouts.Responsive;
  const singlePageLayout = activityLayout === ActivityLayouts.SinglePage;
  return (
    <div className={`embeddable ${embeddableWrapper.embeddable.is_full_width || staticWidth || singlePageLayout ? "full-width" : "reduced-width"}`} data-cy="embeddable">
      { QComponent
        ? <QComponent embeddable={embeddableWrapper.embeddable} questionNumber={questionNumber} isPageIntroduction={isPageIntroduction} />
        : <div>Content type not supported</div>
      }
    </div>
  );
};
