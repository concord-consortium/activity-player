import React from "react";
import classNames from "classnames";
import IconBlock from "../../assets/svg-icons/icon-block.svg";
import IconCheckCircle from "../../assets/svg-icons/icon-check-circle.svg";
import type { IBanner } from "../../utilities/disabled-questions";

import "./disabled-questions-banner.scss";

interface IProps {
  banner: IBanner;
  /** Spans the whole notebook tab, under the tabs, rather than one question's cell. */
  tab?: boolean;
}

export const DisabledQuestionsBanner: React.FC<IProps> = ({ banner, tab }) => {
  const Icon = banner.state === "locked" ? IconBlock : IconCheckCircle;
  return (
    <div className={classNames("disabled-questions-banner", banner.state, { tab })} data-cy="disabled-questions-banner">
      <span className="icon-line">
        <Icon className="icon" aria-hidden="true" focusable="false" />
      </span>
      <span>{banner.text}</span>
    </div>
  );
};
