import React from "react";
import { TextBox } from "./text-box/text-box";
import { ManagedInteractive } from "./managed-interactive/managed-interactive";
import { ActivityLayouts, PageLayouts } from "../../utilities/activity-utils";

import "./embeddable.scss";

interface IProps {
  activityLayout?: number;
  embeddable: any;
  isPageIntroduction: boolean;
  pageLayout: string;
  questionNumber?: number;
}

export const Embeddable: React.FC<IProps> = (props) => {
  const { activityLayout, embeddable, isPageIntroduction, pageLayout, questionNumber } = props;
  const EmbeddableComponent: any = {
    "MwInteractive": ManagedInteractive,
    "ManagedInteractive": ManagedInteractive,
    "Embeddable::Xhtml": TextBox,
  };
  const type = embeddable.embeddable.type;
  const QComponent = embeddable ? EmbeddableComponent[type] : undefined;
  const staticWidth = pageLayout === PageLayouts.FortySixty || pageLayout === PageLayouts.SixtyForty || pageLayout === PageLayouts.Responsive;
  const singlePageLayout = activityLayout === ActivityLayouts.SinglePage;
  return (
    <div className={`embeddable ${embeddable.embeddable.is_full_width || staticWidth || singlePageLayout ? "full-width" : "reduced-width"}`} data-cy="embeddable">
      { QComponent
        ? <QComponent embeddable={embeddable.embeddable} questionNumber={questionNumber} isPageIntroduction={isPageIntroduction} />
        : <div>Content type not supported</div>
      }
    </div>
  );
};
