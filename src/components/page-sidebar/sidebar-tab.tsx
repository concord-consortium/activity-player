import React from "react";
import IconArrow from "../../assets/svg-icons/icon-arrow-circle-left.svg";

import './sidebar-tab.scss';

interface IProps {
  handleShowSidebarContent: (show: boolean) => void;
  title: string;
  sidebarOpen: boolean
}

export class SidebarTab extends React.PureComponent <IProps>{
  constructor(props: IProps) {
    super(props);
  }

  render() {
    return(
      <div className='sideBarTab' onClick={this.handleSidebarClick} data-cy="sidebar-tab">
        <div className={`icon ${this.props.sidebarOpen ? 'open' : ''}`}>
          <IconArrow />
        </div>
        <div className='tab-name' data-cy="sidebar-tab-title">{this.props.title}</div>
      </div>
    );
  }

  private handleSidebarClick = () => {
    if (!this.props.sidebarOpen) {
      this.props.handleShowSidebarContent(true);
    } else {
      this.props.handleShowSidebarContent(false);
    }
  }
}
