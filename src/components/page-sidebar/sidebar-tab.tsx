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
    // The visible "tab-name" text is the button's accessible name when a title exists; fall back
    // to a static aria-label only when there is none, so the button is never unnamed.
    const hasTitle = !!this.props.title?.trim();
    return (
      // A native <button> gives the trigger its semantics and Enter/Space activation for free.
      // aria-haspopup="dialog" announces that it opens the sidebar panel; aria-expanded reflects
      // the open state.
      <button type="button" className="sidebar-tab" onClick={this.handleSidebarShow}
           data-cy="sidebar-tab" aria-haspopup="dialog" aria-expanded={this.props.sidebarOpen}
           aria-label={hasTitle ? undefined : "Show sidebar"}>
        {/* A <button> may only contain phrasing content, so these are <span>s, not <div>s;
            the parent's display:flex blockifies them, so layout is unchanged. */}
        <span className={`icon ${this.props.sidebarOpen ? "open" : ""}`}>
          <IconArrow aria-hidden="true" focusable="false" />
        </span>
        <span className="tab-name" data-cy="sidebar-tab-title">{this.props.title}</span>
      </button>
    );
  }

  private handleSidebarShow = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (accessibilityClick(e)) {
      this.props.handleShowSidebarContent(this.props.index, !this.props.sidebarOpen);
    }
  }
}
