import React  from "react";
import { Page, Activity } from "../../types";
import { SidebarWrapper } from "../page-sidebar/sidebar-wrapper";
import { EmbeddablePluginSideTip } from "../activity-page/plugins/embeddable-plugin-sidetip";
import { getPageSideTipEmbeddables, getPageSideBars } from "../../utilities/activity-utils";

import "./expandable-container.scss";

const kExpandableContentTop = 152;
const kExpandableContentMargin = 19;
const kExpandableItemHeight = 79;

interface IProps {
  activity: Activity;
  page: Page;
  pageNumber: number;
  teacherEditionMode?: boolean;
  pluginsLoaded?: boolean;
  plugin?: boolean;
}

export const ExpandableContainer: React.FC<IProps> = (props) => {
  const { activity, page, pageNumber, teacherEditionMode, pluginsLoaded, plugin } = props;
  const sideTips = pluginsLoaded && page ? getPageSideTipEmbeddables(activity, page) : [];
  const numSideTips = sideTips?.length || 0;
  const verticalOffset = kExpandableContentTop + (numSideTips + (plugin ? 1 : 0)) * (kExpandableItemHeight + kExpandableContentMargin);
  const sidebars = page && getPageSideBars(activity, page);
  return (
    <div className="expandable-container" id="expandable-container" key={pageNumber} data-cy="expandable-container">
      { teacherEditionMode && sideTips?.map((sideTip: any) =>
          // Technically, the EmbeddablePluginSideTip won't be rendered if the plugins aren't loaded yet,
          // but passing pluginLoaded into it makes it more consistent with the other plugins components
          <EmbeddablePluginSideTip
            key={sideTip.ref_id}
            embeddable={sideTip}
            pluginsLoaded={pluginsLoaded}
          />)
      }
      { sidebars && sidebars.length > 0 &&
        <SidebarWrapper sidebars={sidebars} verticalOffset={verticalOffset} />
      }
    </div>
  );
};
