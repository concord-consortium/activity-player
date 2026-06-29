import React from "react";
import IconClose from "../../assets/svg-icons/icon-close.svg";
import { renderHTML } from "../../utilities/render-html";
import { accessibilityClick } from "../../utilities/accessibility-helper";

import "./sidebar-panel.scss";
import { DynamicText } from "@concord-consortium/dynamic-text";

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
    // Only use a heading when there is title text; otherwise keep a non-heading
    // placeholder so the close button stays positioned without an empty heading.
    const hasTitle = !!this.props.title?.trim();
    return (
      <div className={`sidebar-panel ${this.props.show ? "visible " : "hidden"}`}>
        <div className="sidebar-header">
          {hasTitle
            ? <h2 className="sidebar-title" data-cy="sidebar-title">{this.props.title}</h2>
            : <div className="sidebar-title" data-cy="sidebar-title" />}
          {/* A native <button> gives the close control its semantics and Enter/Space activation
              for free; aria-label supplies its accessible name since the "x" icon is decorative. */}
          <button type="button" className="icon" onClick={this.handleCloseButton}
               data-cy="sidebar-close-button" aria-label="Close">
            <IconClose aria-hidden="true" focusable="false" />
          </button>
        </div>
        <DynamicText>
          <div className="sidebar-content help-content" data-cy="sidebar-content">{renderHTML(innerContent)}
          </div>
        </DynamicText>
      </div>
    );
  }

  private handleCloseButton = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (accessibilityClick(e)){
      this.props.handleCloseSidebarContent(this.props.index, false);
    }
  }
}
