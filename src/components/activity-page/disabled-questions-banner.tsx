import React from "react";
import classNames from "classnames";
import IconBlock from "../../assets/svg-icons/icon-block.svg";
import IconCheckCircle from "../../assets/svg-icons/icon-check-circle.svg";
import { BannerState } from "./disabled-questions-context";

import "./disabled-questions-banner.scss";

export const kLockedBannerText = "Run the Wildfire Explorer and Hazbot Analysis, then answer these questions!";
export const kUnlockedBannerText = "The questions are now unlocked!";

interface IProps {
  state: BannerState;
  /** Spans the whole notebook tab, under the tabs, rather than one question's cell. */
  tab?: boolean;
}

export const DisabledQuestionsBanner: React.FC<IProps> = ({ state, tab }) => {
  const Icon = state === "locked" ? IconBlock : IconCheckCircle;
  return (
    <div className={classNames("disabled-questions-banner", state, { tab })} role="status" data-cy="disabled-questions-banner">
      <Icon className="icon" aria-hidden="true" focusable="false" />
      <span>{state === "locked" ? kLockedBannerText : kUnlockedBannerText}</span>
    </div>
  );
};
