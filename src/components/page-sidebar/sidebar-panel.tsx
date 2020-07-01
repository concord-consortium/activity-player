import React from "react";
import IconClose from "../../assets/svg-icons/icon-close.svg";

import './sidebar-panel.scss';

interface IProps {
  handleCloseSidebarContent: (show: boolean) => void;
  content: string | null;
  title: string;
}

export class SidebarPanel extends React.PureComponent<IProps>{
  render() {
    const innerContent = this.props.content ? this.props.content : "";
    return (
      <div className="sidebarPanel">
        <div className='sidebarHeader'>
          <div className='sidebarTitle' data-cy="sidebar-title">{this.props.title}</div>
          <div className='icon' onClick={this.handleCloseButtonClick} data-cy="sidebar-close-button">
            <IconClose />
          </div>
        </div>
        <div className='sidebarContent' data-cy="sidebar-content" dangerouslySetInnerHTML={{__html: innerContent}}>
        </div>
      </div>
    );
  }

  private handleCloseButtonClick = () => {
    this.props.handleCloseSidebarContent(false);
  }
}
