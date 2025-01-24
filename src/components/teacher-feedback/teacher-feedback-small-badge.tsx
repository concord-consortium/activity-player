import React from "react";
import classNames from "classnames";
import TeacherFeedbackBadgeIcon from "../../assets/svg-icons/teacher-feedback-small-badge.svg";

import "./teacher-feedback-small-badge.scss";

interface IProps {
  location?: "page-links" | "nav-pages";
}

export const TeacherFeedbackSmallBadge = ({location}: IProps) => {
  const className = classNames("teacher-feedback-small-badge",
    {"page-links-badge": location === "page-links"},
    {"nav-pages-badge": location === "nav-pages"}
  );

  return (
    <div
      className={className}
      data-testid="teacher-feedback-small-badge"
      title="Your teacher left feedback on this page."
    >
      <TeacherFeedbackBadgeIcon className="teacher-feedback-small-badge-icon" />
    </div>
  );
};

