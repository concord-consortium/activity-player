import React, { useCallback, useRef } from "react";
import { SidebarTab } from "./sidebar-tab";
import { SidebarPanel } from "./sidebar-panel";

import "./sidebar.scss";

interface IProps {
  content: string | null;
  handleShowSidebar: (index: number, show: boolean) => void;
  index: number;
  show: boolean;
  style?: any;
  title: string | null;
}

export const Sidebar: React.FC<IProps> = (props) => {
  const { content, handleShowSidebar, index, show, style, title } = props;
  // Shared id links the trigger (aria-controls) to the dialog panel.
  const panelId = `sidebar-panel-${index}`;
  // Lets the panel return focus to the trigger when the dialog closes.
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleOverlayClick = useCallback(() => {
    handleShowSidebar(index, false);
  }, [handleShowSidebar, index]);

  return (
    <React.Fragment>
      {/* While the dialog is open this transparent overlay (a sibling of the container,
          so it sits one z-index below it) makes the page behind it inert to pointer
          input and dismisses the dialog on an outside click. The container's .expanded
          box-shadow supplies the visual dimming, so the overlay stays transparent. */}
      {show &&
        <div className="sidebar-overlay" data-cy="sidebar-overlay" aria-hidden="true" onClick={handleOverlayClick} />
      }
      <div className={`sidebar-container ${show ? "expanded" : ""}`} style={style} data-cy="sidebar">
        <SidebarTab
          handleShowSidebarContent={handleShowSidebar}
          index={index}
          panelId={panelId}
          sidebarOpen={show}
          title={title}
          triggerRef={triggerRef}
        />
        <SidebarPanel
          content={content}
          handleCloseSidebarContent={handleShowSidebar}
          index={index}
          panelId={panelId}
          title={title}
          show={show}
          triggerRef={triggerRef}
        />
      </div>
    </React.Fragment>
  );
};
