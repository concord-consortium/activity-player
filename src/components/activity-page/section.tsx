import React, { useRef, useState } from "react";
import classNames from "classnames";
import { Embeddable, EmbeddableImperativeAPI } from "./embeddable";
import { isQuestion,  getLinkedPluginEmbeddable, ActivityLayouts } from "../../utilities/activity-utils";
import { accessibilityClick } from "../../utilities/accessibility-helper";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";
import { EmbeddableType, Page, SectionType } from "../../types";
import { Logger, LogEventName } from "../../lib/logger";
import { INavigationOptions } from "@concord-consortium/lara-interactive-api";

import "./section.scss";

interface IProps {
  page: Page;
  section: SectionType;
  activityLayout: number;
  questionNumberStart: number;
  teacherEditionMode?: boolean;
  setNavigation?: (refId: string, options: INavigationOptions) => void;
  pluginsLoaded: boolean;
}

export const Section: React.FC<IProps> = (props) => {
  const { activityLayout, page, section, questionNumberStart } = props;
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState(false);

  const sectionDivRef = useRef<HTMLDivElement>(null);
  const primaryDivRef = useRef<HTMLDivElement>(null);
  const secondaryDivRef = useRef<HTMLDivElement>(null);
  const embeddableRefs: Record<string, React.RefObject<EmbeddableImperativeAPI>> = {};

  const renderEmbeddables = (embeddablesToRender: EmbeddableType[], questionNumStart: number, isSingleColumn?: boolean) => {
    let questionNumber = questionNumStart;
    return (
      <React.Fragment>
        { embeddablesToRender.map((embeddable, embeddableIndex) => {
            if (isQuestion(embeddable)) {
              questionNumber++;
            }
            const linkedPluginEmbeddable = getLinkedPluginEmbeddable(page, embeddable.ref_id);
            if (!embeddableRefs[embeddable.ref_id]) {
              embeddableRefs[embeddable.ref_id] = React.createRef<EmbeddableImperativeAPI>();
            }
            return (
              <Embeddable
                embeddableRef={embeddableRefs[embeddable.ref_id]}
                key={`embeddable-${embeddableIndex}-${embeddable.ref_id}`}
                embeddable={embeddable}
                sectionLayout={isSingleColumn ? "full-width" : section.layout}
                activityLayout={activityLayout}
                displayMode={section.secondary_column_display_mode}
                questionNumber={isQuestion(embeddable) ? questionNumber : undefined}
                linkedPluginEmbeddable={linkedPluginEmbeddable}
                teacherEditionMode={props.teacherEditionMode}
                setNavigation={props.setNavigation}
                pluginsLoaded={props.pluginsLoaded}
              />
            );
          })
        }
      </React.Fragment>
    );
  };

  const renderPrimaryEmbeddables = (primaryEmbeddablesToRender: EmbeddableType[], questionNumStart: number) => {
    const containerClass = classNames("column", layout, "primary", {"expand": isSecondaryCollapsed});
    return (
        <div className={containerClass} ref={primaryDivRef} data-cy="section-column-primary">
          <div className="embeddableWrapper">
            {renderEmbeddables(primaryEmbeddablesToRender, questionNumStart)}
          </div>
        </div>
    );
  };

  const renderSecondaryEmbeddables = (secondaryEmbeddablesToRender: EmbeddableType[], questionNumStart: number) => {
    const collapsible = section.secondary_column_collapsible;
    const containerClass = classNames("column", layout, "secondary", {"collapsed": isSecondaryCollapsed});
    return (
      <div className={containerClass} ref={secondaryDivRef} data-cy="section-column-secondary">
        {secondaryEmbeddablesToRender.length > 0 && collapsible && renderCollapsibleHeader()}
        {!isSecondaryCollapsed && renderEmbeddables(secondaryEmbeddablesToRender, questionNumStart)}
      </div>
    );
  };

  const renderCollapsibleHeader = () => {
    const rightOrientation = section.layout.includes("l");
    const headerClass = `collapsible-header ${isSecondaryCollapsed ? "collapsed" : ""} ${rightOrientation ? "right" : ""}`;
    return (
      <div className={headerClass} data-cy="collapsible-header" tabIndex={0}
            onClick={handleCollapseHeader} onKeyDown={handleCollapseHeader} >
        {isSecondaryCollapsed
          ? <React.Fragment>
              {renderCollapseArrow(rightOrientation)}
              <div>Show</div>
            </React.Fragment>
          : <React.Fragment>
              {rightOrientation && <div>Hide</div>}
              {renderCollapseArrow(!rightOrientation)}
              {!rightOrientation && <div>Hide</div>}
            </React.Fragment>
        }
      </div>
    );
  };

  const renderCollapseArrow = (leftArrow: boolean) => {
    return (
      leftArrow
        ? <IconChevronLeft
          width={32}
          height={32}
          fill={"white"}
        />
        : <IconChevronRight
          width={32}
          height={32}
          fill={"white"}
        />
    );
  };

  const handleCollapseHeader = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
    if (accessibilityClick(e))  {
      Logger.log({
        event: LogEventName.toggle_collapsible_column,
        parameters:{ hide_column: !isSecondaryCollapsed }
      });
      setIsSecondaryCollapsed( !isSecondaryCollapsed );
    }
  };

  const layout = section.layout;
  const display_mode = section.secondary_column_display_mode;
  const singlePage = activityLayout === ActivityLayouts.SinglePage;
  const responsiveFullWidth = layout === "responsive-full-width";
  const responsive2Column = layout === "responsive-2-columns";
  const splitLayout = layout === "60-40" ||
                      layout === "40-60" ||
                      layout === "70-30" ||
                      layout === "30-70" ||
                      responsive2Column;
  const responsiveSection = responsive2Column || responsiveFullWidth || layout === "responsive";
  const sectionClass = classNames("section",
                                  {"full-width": layout === "full-width" || singlePage},
                                  {"l_6040": layout === "60-40"},
                                  {"r_4060": layout === "40-60"},
                                  {"l_7030": layout === "70-30"},
                                  {"r_3070": layout === "30-70"},
                                  {"responsive": responsiveSection && !singlePage},
                                  {"stacked": display_mode === "stacked"},
                                  {"carousel": display_mode === "carousel"}
                                );
  const embeddables = section.embeddables;

  const primaryEmbeddables = splitLayout || layout === "responsive" ? embeddables.filter(e => e.column === "primary" && !e.is_hidden) : [];
  const secondaryEmbeddables = splitLayout || layout === "responsive" ? embeddables.filter(e => e.column === "secondary" && !e.is_hidden) : [];
  const responsiveIsSingleColumn = (responsiveFullWidth && (embeddables.length > 0 && primaryEmbeddables.length === 0 && secondaryEmbeddables.length === 0));
  const singleColumn = layout === "full-width" || responsiveFullWidth || responsiveIsSingleColumn;
  const responsiveDirection  = singleColumn ? "column" : "row";
  const responsiveDirectionStyle = { flexDirection: responsiveDirection } as React.CSSProperties;
  const leftPrimary = layout === "60-40" || layout === "70-30";
  if (singleColumn || singlePage) {
    return (
      <div className={sectionClass} ref={sectionDivRef} style={responsiveDirectionStyle} data-cy="section-single-column-layout">
        { renderEmbeddables(embeddables, questionNumberStart, singleColumn) }
      </div>
    );
  } else {
    const leftColumnEmbeddables = leftPrimary ? primaryEmbeddables : secondaryEmbeddables;
    const rightColumnEmbeddables = leftPrimary ? secondaryEmbeddables : primaryEmbeddables;
    const numQuestionsLeftColumn = leftPrimary ? primaryEmbeddables.length : secondaryEmbeddables.length;
    const rightColumnQuestionNumberStart = questionNumberStart + numQuestionsLeftColumn;
    return (
      <div className={sectionClass} ref={sectionDivRef} data-cy="section-split-layout">
        {leftPrimary
          ? renderPrimaryEmbeddables(leftColumnEmbeddables, questionNumberStart)
          : renderSecondaryEmbeddables(leftColumnEmbeddables, questionNumberStart)
        }
        {leftPrimary
          ? renderSecondaryEmbeddables(rightColumnEmbeddables, rightColumnQuestionNumberStart)
          : renderPrimaryEmbeddables(rightColumnEmbeddables, rightColumnQuestionNumberStart)
        }
      </div>
    );
  }
};
