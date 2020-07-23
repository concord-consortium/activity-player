import React from "react";
import IconClose from "../../assets/svg-icons/icon-close.svg";
import { renderHTML } from "../../utilities/render-html";

import "./sidebar-panel.scss";

interface IProps {
  handleCloseSidebarContent: (index: number, show: boolean) => void;
  index: number;
  content: string | null;
  title: string;
}

export class SidebarPanel extends React.PureComponent<IProps>{
  render() {
    const innerContent = this.props.content ? this.props.content : "";
    return (
      <div className="sidebarPanel">
        <div className="sidebarHeader">
          <div className="sidebarTitle" data-cy="sidebar-title">{this.props.title}</div>
          <div className="icon" onClick={this.handleCloseButtonClick} data-cy="sidebar-close-button">
            <IconClose />
          </div>
        </div>
        <div className="sidebarContent" data-cy="sidebar-content">{renderHTML(innerContent)}
        </div>
      </div>
    );
  }

  private handleCloseButtonClick = () => {
    this.props.handleCloseSidebarContent(this.props.index, false);
  }
}
