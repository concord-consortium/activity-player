import React, { useCallback, useEffect, useRef, useState } from "react";
import classNames from "classnames";
import { Embeddable, EmbeddableImperativeAPI } from "./embeddable";
import { isQuestion,  getLinkedPluginEmbeddable } from "../../utilities/activity-utils";
import { accessibilityClick } from "../../utilities/accessibility-helper";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";
import { EmbeddableType, SectionType } from "../../types";
import { Logger, LogEventName } from "../../lib/logger";
import { showReport } from "../../utilities/report-utils";

import "./activity-page-content.scss";
import { INavigationOptions, setHeight } from "@concord-consortium/lara-interactive-api";

interface IProps {
  section: SectionType;
  questionNumberStart: number;
  teacherEditionMode?: boolean;
  setNavigation: (refId: string, options: INavigationOptions) => void;
  pluginsLoaded: boolean;
}

let primaryDivRefChild:HTMLDivElement;
export const Section: React.FC<IProps> = (props) => {
  const { section, questionNumberStart } = props;
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState(false);
  // const [scrollOffset, setScrollOffset] = useState(0);
  const [primaryEmbeddableTotalHeight, setPrimaryEmbeddableTotalHeight] = useState(0);
  const sectionDivRef = useRef<HTMLDivElement>(null);
  const primaryDivRef = useRef<HTMLDivElement>(null);
  const secondaryDivRef = useRef<HTMLDivElement>(null);
  const embeddableRefs: Record<string, React.RefObject<EmbeddableImperativeAPI>> = {};
  console.log("in before section useEffect");

  useEffect(()=>{
      console.log("in section useEffect");
    if (primaryDivRef.current !== null) {
      primaryDivRefChild = primaryDivRef.current.children[0] as HTMLDivElement;
      console.log("primaryDivRef.current:", primaryDivRef.current);
      console.log("primaryDivRef.current.children:", primaryDivRef.current.children);
      console.log("getBoundingClientRect.height:", primaryDivRef.current.getBoundingClientRect());
      console.log("clientHeight:", primaryDivRef.current.clientHeight);
      console.log("child getBoundingClientRect.height:", primaryDivRef.current.children[0].getBoundingClientRect());
      console.log("clientHeight primaryDivRef.current.children:", primaryDivRef.current.children[0].clientHeight);
      console.log("className primaryDivRef.current:", primaryDivRef.current.className);
      console.log("className primaryDivRef.current.children:", primaryDivRef.current.children[0].className);

      let totalHeight=0;
      for (let i=0; i<primaryDivRef.current.children.length; i++) {
        console.log("children clientHeight:", primaryDivRef.current.children[i].clientHeight);
        totalHeight = totalHeight + primaryDivRef.current.children[i].clientHeight;
      }
      setPrimaryEmbeddableTotalHeight(totalHeight);
    }
  });

  const renderEmbeddables = (embeddablesToRender: EmbeddableType[], questionNumStart: number, offSet?: number) => {
    let questionNumber = questionNumStart;
    console.log("in renderEmbeddables");
    return (
      <React.Fragment>
        { embeddablesToRender.map((embeddable, embeddableIndex) => {
            if (isQuestion(embeddable)) {
              questionNumber++;
            }
            const linkedPluginEmbeddable = getLinkedPluginEmbeddable(section, embeddable.ref_id);
            if (!embeddableRefs[embeddable.ref_id]) {
              embeddableRefs[embeddable.ref_id] = React.createRef<EmbeddableImperativeAPI>();
            }
            return (
              <Embeddable
                ref={embeddableRefs[embeddable.ref_id]}
                key={`embeddable-${embeddableIndex}-${embeddable.ref_id}`}
                embeddable={embeddable}
                sectionLayout={section.layout}
                displayMode={section.secondary_column_display_mode}
                questionNumber={isQuestion(embeddable) ? questionNumber : undefined}
                linkedPluginEmbeddable={linkedPluginEmbeddable}
                teacherEditionMode={props.teacherEditionMode}
                setNavigation={props.setNavigation}
                pluginsLoaded={props.pluginsLoaded}
                pinOffSet={offSet}
              />
            );
          })
        }
      </React.Fragment>
    );
  };

  const renderPrimaryEmbeddables = (primaryEmbeddablesToRender: EmbeddableType[], questionNumStart: number) => {
    // const position = { maxHeight: 516, top: 0 };
    console.log("in primarydiv");
    console.log("primaryDivRefChild", primaryDivRefChild?.getBoundingClientRect());
    console.log("getBoundingClientRect.height:", primaryDivRef.current?.children[0].getBoundingClientRect());
    const position = { top: 0 };
    const containerClass = classNames("column", layout, "primary", {"expand": isSecondaryCollapsed});
    return (
        <div className={containerClass} style={position} ref={primaryDivRef}>
          {renderEmbeddables(primaryEmbeddablesToRender, questionNumStart)}
        </div>
    );
  };

  const renderSecondaryEmbeddables = (secondaryEmbeddablesToRender: EmbeddableType[], questionNumStart: number) => {
    console.log("in secondarydiv");

    const collapsible = section.secondary_column_collapsible;
    const containerClass = classNames("column", layout, "secondary", {"collapsed": isSecondaryCollapsed});
    return (
      <div className={containerClass} ref={secondaryDivRef}>
        {collapsible && renderCollapsibleHeader()}
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
  const sectionClass = classNames("section",
                                  {"full-width": layout === "full-width"},
                                  {"l_6040": layout === "l-6040"},
                                  {"r_6040": layout === "r-6040"},
                                  {"l_7030": layout === "l-7030"},
                                  {"r_3070": layout === "r-3070"},
                                  {"responsive": layout === "responsive"},
                                  {"stacked": display_mode === "stacked"},
                                  {"carousel": display_mode === "carousel"}
                                );
  const embeddables = section.embeddables;
  const primaryEmbeddables = embeddables.filter(e => e.column === "primary" && !e.is_hidden);
  const secondaryEmbeddables = embeddables.filter(e => e.column === "secondary" && !e.is_hidden);
  const singleColumn = layout === "full-width" ||
                        (layout === "responsive" && primaryEmbeddables.length === 0 && secondaryEmbeddables.length === 0);

  if (singleColumn) {
    return (
      <div className = {sectionClass} ref={sectionDivRef}>
        { renderEmbeddables(embeddables, questionNumberStart) }
      </div>
    );
  } else {
    const leftColumnEmbeddables = layout.includes("l") ? primaryEmbeddables : secondaryEmbeddables;
    const rightColumnEmbeddables = layout.includes("l") ? secondaryEmbeddables : primaryEmbeddables;
    const numQuestionsLeftColumn = layout.includes("l") ? primaryEmbeddables.length : secondaryEmbeddables.length;
    const rightColumnQuestionNumberStart = questionNumberStart + numQuestionsLeftColumn;
    return (
      <div className = {sectionClass} ref={sectionDivRef}>
        {layout.includes("l")
          ? renderPrimaryEmbeddables(leftColumnEmbeddables, questionNumberStart)
          : renderSecondaryEmbeddables(leftColumnEmbeddables, questionNumberStart)
        }
        {layout.includes("l")
          ? renderSecondaryEmbeddables(rightColumnEmbeddables, rightColumnQuestionNumberStart)
          : renderPrimaryEmbeddables(rightColumnEmbeddables, rightColumnQuestionNumberStart)
        }
      </div>
    );
  }
};
