import React from "react";
import IconArrow from "../../assets/svg-icons/icon-arrow-circle-left.svg";

import "./sidebar-tab.scss";

interface IProps {
  handleShowSidebarContent: (index: number, show: boolean) => void;
  index: number;
  title: string | null;
  sidebarOpen: boolean
}

export class SidebarTab extends React.PureComponent <IProps>{
  constructor(props: IProps) {
    super(props);
  }

  render() {
    return(
      <div className="sideBarTab" onClick={this.handleSidebarClick} data-cy="sidebar-tab">
        <div className={`icon ${this.props.sidebarOpen ? "open" : "" }`}>
          <IconArrow />
        </div>
        <div className="tab-name" data-cy="sidebar-tab-title">{this.props.title}</div>
      </div>
    );
  }

  private handleSidebarClick = () => {
    this.props.handleShowSidebarContent(this.props.index, !this.props.sidebarOpen);
  }
}
