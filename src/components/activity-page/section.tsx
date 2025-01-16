import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Rand from "rand-seed";
import classNames from "classnames";
import { Embeddable, EmbeddableImperativeAPI } from "./embeddable";
import { isQuestion,  getLinkedPluginEmbeddable, ActivityLayouts } from "../../utilities/activity-utils";
import { accessibilityClick } from "../../utilities/accessibility-helper";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";
import { EmbeddableType, Page, SectionType } from "../../types";
import { Logger, LogEventName } from "../../lib/logger";
import { IGetInteractiveState, INavigationOptions } from "@concord-consortium/lara-interactive-api";
import useResizeObserver from "@react-hook/resize-observer";

import "./section.scss";

interface IProps {
  page: Page;
  section: SectionType;
  activityLayout: number;
  questionNumberStart: number;
  teacherEditionMode?: boolean;
  setNavigation?: (refId: string, options: INavigationOptions) => void;
  pluginsLoaded: boolean;
  ref?: React.Ref<SectionImperativeAPI>;
  hiddenTab?: boolean;
  hideQuestionNumbers?: boolean;
  randomNumGenerator?: Rand;
}

export interface SectionImperativeAPI {
  requestInteractiveStates: (options?: IGetInteractiveState) => Promise<void>[];
}

const right = "right";
const left = "left";

export const Section: React.ForwardRefExoticComponent<IProps> = forwardRef((props, ref) => {
  const { activityLayout, page, section, questionNumberStart, hiddenTab, randomNumGenerator } = props;
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState(false);

  const sectionDivRef = useRef<HTMLDivElement>(null);
  const primaryDivRef = useRef<HTMLDivElement>(null);
  const secondaryDivRef = useRef<HTMLDivElement>(null);
  const embeddableRefs = useRef<Record<string, React.RefObject<EmbeddableImperativeAPI>>>({});

  // cf. https://www.npmjs.com/package/@react-hook/resize-observer
  const useSize = (target: any) => {
    const [size, setSize] = React.useState();
    useResizeObserver(target, (entry: any) => setSize(entry.contentRect));
    return size;
  };
  // use this to get browser height when deiciding to pin or not
  const [screenHeight, getDimension] = useState({
    dynamicHeight: window.innerHeight
  });
  const setDimension = () => {
    getDimension({
      dynamicHeight: window.innerHeight
    });
  };
  useEffect(() => {
    window.addEventListener("resize", setDimension);
    return(() => {
      window.removeEventListener("resize", setDimension);
    });
  }, [screenHeight]);

  useImperativeHandle(ref, () => ({
    requestInteractiveStates: (options?: IGetInteractiveState) =>
      section.embeddables.map((embeddable: EmbeddableType) =>
        embeddableRefs.current[embeddable.ref_id]?.current?.requestInteractiveState(options) || Promise.resolve()
      )
  }));

  const renderEmbeddables = (embeddablesToRender: EmbeddableType[], questionNumStart: number, isSingleColumn?: boolean) => {
    let questionNumber = questionNumStart;
    return (
      <React.Fragment>
        { embeddablesToRender.map((embeddable, embeddableIndex) => {
            if (isQuestion(embeddable)) {
              questionNumber++;
            }
            const linkedPluginEmbeddable = getLinkedPluginEmbeddable(page, embeddable.ref_id);
            if (!embeddableRefs.current[embeddable.ref_id]) {
              embeddableRefs.current[embeddable.ref_id] = React.createRef<EmbeddableImperativeAPI>();
            }
            return (
              <Embeddable
                ref={embeddableRefs.current[embeddable.ref_id]}
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
                hideQuestionNumbers={props.hideQuestionNumbers}
                randomNumGenerator={randomNumGenerator}
              />
            );
          })
        }
      </React.Fragment>
    );
  };

    const embeddableWrapperDivRef = React.useRef(null);
    const wrapperSize: any = useSize(embeddableWrapperDivRef);

    const renderPrimaryEmbeddables = (primaryEmbeddablesToRender: EmbeddableType[], questionNumStart: number) => {
    const maxAspectRatioEmbeddables = primaryEmbeddablesToRender.filter(e => {
      if (e.type === "ManagedInteractive") {
        return e.custom_aspect_ratio_method === "MAX";
      } else {
        return e.aspect_ratio_method === "MAX";
      }
    });

    const hasMaxAspectRatio = maxAspectRatioEmbeddables.length > 0;
    const containerClass = classNames("column", layout, "primary", {"expand": isSecondaryCollapsed},
                                      {"max-aspect-ratio": hasMaxAspectRatio});
    const isPinned = wrapperSize?.height < screenHeight.dynamicHeight;
    const wrapperClass = classNames ("embeddableWrapper", {"pinned": isPinned});
    return (
      <div className={containerClass} ref={primaryDivRef} data-cy="section-column-primary">
        <div className={wrapperClass} ref={embeddableWrapperDivRef}>
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
    const collapsibleColumnOnLeft = section.layout === "30-70" || section.layout === "40-60" || section.layout === "responsive-2-columns";
    const headerClass = `collapsible-header ${isSecondaryCollapsed ? "collapsed" : ""} ${collapsibleColumnOnLeft ? left : right}`;
    return (
      <div className={headerClass} data-cy="collapsible-header" tabIndex={0}
            onClick={handleCollapseHeader} onKeyDown={handleCollapseHeader} >
        {isSecondaryCollapsed
          ? <React.Fragment>
              {renderCollapseArrow(collapsibleColumnOnLeft ? right : left)}
              <div>Show</div>
            </React.Fragment>
          : <React.Fragment>
              {!collapsibleColumnOnLeft && <div>Hide</div>}
              {renderCollapseArrow(collapsibleColumnOnLeft ? left : right)}
              {collapsibleColumnOnLeft && <div>Hide</div>}
            </React.Fragment>
        }
      </div>
    );
  };

  const renderCollapseArrow = (arrowType: "left" | "right" ) => {
    return (
      arrowType === left
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
                                  {"carousel": display_mode === "carousel"},
                                  {"hidden-tab": hiddenTab},
                                  {"tab-contents": activityLayout === ActivityLayouts.Notebook}
                                );
  const embeddables = section.embeddables;

  const primaryEmbeddables = splitLayout || layout === "responsive" ? embeddables.filter(e => e.column === "primary" && !e.is_hidden) : [];
  const secondaryEmbeddables = splitLayout || layout === "responsive" ? embeddables.filter(e => e.column === "secondary" && !e.is_hidden) : [];
  const responsiveIsSingleColumn = (responsiveFullWidth && (embeddables.length > 0 && primaryEmbeddables.length === 0 && secondaryEmbeddables.length === 0));
  const singleColumn = layout === "full-width" || responsiveFullWidth || responsiveIsSingleColumn;
  const responsiveDirection  = singleColumn ? "column" : "row";
  const responsiveDirectionStyle = { flexDirection: responsiveDirection } as React.CSSProperties;
  const leftPrimary = layout === "60-40" || layout === "70-30";
  const getNumQuestionsLeftColumn = () => {
    const column = leftPrimary ? primaryEmbeddables : secondaryEmbeddables;
    let numQuestions = 0;
      column.forEach(embeddable => {
         isQuestion(embeddable) && numQuestions++;
      });
    return numQuestions;
  };
  if (singleColumn || singlePage) {
    return (
      <div className={sectionClass} ref={sectionDivRef} style={responsiveDirectionStyle} data-cy="section-single-column-layout">
        { renderEmbeddables(embeddables, questionNumberStart, singleColumn) }
      </div>
    );
  } else {
    const leftColumnEmbeddables = leftPrimary ? primaryEmbeddables : secondaryEmbeddables;
    const rightColumnEmbeddables = leftPrimary ? secondaryEmbeddables : primaryEmbeddables;
    const numQuestionsLeftColumn = getNumQuestionsLeftColumn();
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
});
Section.displayName = "Section";
