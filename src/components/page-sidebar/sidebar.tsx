import React from "react";
import { SidebarTab } from "./sidebar-tab";
import { SidebarPanel } from "./sidebar-panel";

import "./sidebar.scss";

interface IProps {
  content: string | null;
  style?: any;
  title: string;
}

interface IState {
  showSidebarContent: boolean;
}

export class Sidebar extends React.PureComponent<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { showSidebarContent: false };
  }
  render() {
    const { content, style, title } = this.props;
    return (
      <div className={`sidebarContainer ${this.state.showSidebarContent ? "sidebarContainer expanded" : ""}`} style={style}>
        <SidebarTab
          title={title}
          handleShowSidebarContent={this.setShowSidebarContent}
          sidebarOpen={this.state.showSidebarContent}
        />
        <SidebarPanel
          title={title}
          content={content}
          handleCloseSidebarContent={this.setShowSidebarContent}
        />
      </div>
    );
  }

  private setShowSidebarContent = (show: boolean) => {
    this.setState({ showSidebarContent: show });
  }
}
