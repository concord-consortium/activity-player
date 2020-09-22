import React  from "react";
import { Page, Activity } from "../../types";
import { SidebarWrapper } from "../page-sidebar/sidebar-wrapper";
import { EmbeddablePluginSideTip } from "../activity-page/plugins/embeddable-plugin-sidetip";
import { getPageSideTipEmbeddables, getPageSideBars } from "../../utilities/activity-utils";

import "./expandable-container.scss";

const kExpandableContentMargin = 19;
const kExpandableItemHeight = 79;

interface IProps {
  activity: Activity;
  page: Page;
  pageNumber: number;
  teacherEditionMode?: boolean;
}

export const ExpandableContainer: React.FC<IProps> = (props) => {
  const { activity, page, pageNumber, teacherEditionMode } = props;
  const activityHeader = document.getElementsByClassName("activity-header");
  const contentTopPosition = activityHeader[0].getBoundingClientRect().top;
  const sideTips = getPageSideTipEmbeddables(page);
  const verticalOffset = contentTopPosition + sideTips.length * (kExpandableItemHeight + kExpandableContentMargin);
  const sidebars = getPageSideBars(activity, page);
  return (
    <div className="expandable-container" id="expandable-container" key={pageNumber}>
      { teacherEditionMode && sideTips.map((sideTip: any) =>
          <EmbeddablePluginSideTip
            key={sideTip.embeddable.ref_id}
            embeddable={sideTip.embeddable}
          />)
      }
      { sidebars.length > 0 &&
        <SidebarWrapper sidebars={sidebars} verticalOffset={verticalOffset} />
      }
    </div>
  );
};
