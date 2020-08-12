import React, { useRef, useEffect }  from "react";
import { TextBox } from "./text-box/text-box";
import { ManagedInteractive } from "./managed-interactive/managed-interactive";
import { ActivityLayouts, PageLayouts } from "../../utilities/activity-utils";
import { EmbeddablePlugin } from "./plugins/embeddable-plugin";
import { initializePlugin } from "../../utilities/plugin-utils";
import { EmbeddableWrapper, IEmbeddablePlugin } from "../../types";

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

  let qComponent;
  if (embeddable.type === "MwInteractive" || (embeddable.type === "ManagedInteractive" && embeddable.library_interactive)) {
    qComponent = <ManagedInteractive embeddable={embeddable} questionNumber={questionNumber} />;
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
