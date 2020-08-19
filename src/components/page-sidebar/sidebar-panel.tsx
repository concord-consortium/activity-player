import React from "react";
import IconClose from "../../assets/svg-icons/icon-close.svg";
import { renderHTML } from "../../utilities/render-html";
import { accessibilityClick } from "../../utilities/accessibility-helper";

import "./sidebar-panel.scss";

interface IProps {
  handleCloseSidebarContent: (index: number, show: boolean) => void;
  index: number;
  content: string | null;
  title: string | null;
  show: boolean;
}

export class SidebarPanel extends React.PureComponent<IProps>{
  render() {
    const innerContent = this.props.content ? this.props.content : "";
    return (
      <div className={`sidebar-panel ${this.props.show ? "visible " : "hidden"}`}>
        <div className="sidebar-header">
          <div className="sidebar-title" data-cy="sidebar-title">{this.props.title}</div>
          <div className="icon" onClick={this.handleCloseButton} onKeyDown={this.handleCloseButton} 
               data-cy="sidebar-close-button" tabIndex={3}>
            <IconClose />
          </div>
        </div>
        <div className="sidebar-content" data-cy="sidebar-content">{renderHTML(innerContent)}
        </div>
      </div>
    );
  }

  private handleCloseButton = () => {
    if (accessibilityClick(event)){
      this.props.handleCloseSidebarContent(this.props.index, false);
    }
  }
}
