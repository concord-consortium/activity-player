import React from "react";
import IconArrow from "../../assets/svg-icons/icon-arrow-circle-left.svg";
import { accessibilityClick } from "../../utilities/accessibility-helper";

import "./sidebar-tab.scss";

interface IProps {
  handleShowSidebarContent: (index: number, show: boolean) => void;
  index: number;
  title: string | null;
  sidebarOpen: boolean
}

export class SidebarTab extends React.PureComponent<IProps>{
  constructor(props: IProps) {
    super(props);
  }

  render() {
    return (
      // A native <button> gives the trigger its semantics and Enter/Space activation for free.
      // aria-haspopup="dialog" announces that it opens the sidebar panel; aria-expanded reflects
      // the open state. The visible "tab-name" text supplies the button's accessible name.
      <button type="button" className="sidebar-tab" onClick={this.handleSidebarShow}
           data-cy="sidebar-tab" aria-haspopup="dialog" aria-expanded={this.props.sidebarOpen}>
        <div className={`icon ${this.props.sidebarOpen ? "open" : ""}`}>
          <IconArrow aria-hidden="true" focusable="false" />
        </div>
        <div className="tab-name" data-cy="sidebar-tab-title">{this.props.title}</div>
      </button>
    );
  }

  private handleSidebarShow = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (accessibilityClick(e)) {
      this.props.handleShowSidebarContent(this.props.index, !this.props.sidebarOpen);
    }
  }
}
