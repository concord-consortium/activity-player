// src/components/single-question/single-question-header.tsx

import React from "react";
import { Activity, Sequence } from "../../types";
import { FlattenedSlide } from "../../utilities/single-question-utils";
import CCLogo from "../../assets/svg-icons/cclogo.svg";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import "./single-question-header.scss";

interface IProps {
  activity: Activity;
  userName: string;
  sequence?: Sequence;
  currentSlide?: FlattenedSlide;
  onShowSequenceLanding?: () => void;
  onNavigateToPage?: (pageIndex: number) => void;
  onNavigateToSection?: (pageIndex: number, sectionIndex: number) => void;
}

export const SingleQuestionHeader: React.FC<IProps> = ({
  activity,
  userName,
  sequence,
  currentSlide,
  onShowSequenceLanding,
  onNavigateToPage,
  onNavigateToSection,
}) => {
  // Get project logo from activity (same pattern as existing header)
  const projectLogo = activity.project?.logo_ap || null;

  // Build breadcrumb items based on current slide context
  const renderBreadcrumb = () => {
    const items: JSX.Element[] = [];

    // Sequence level (if present)
    if (sequence && onShowSequenceLanding) {
      items.push(
        <button
          key="sequence"
          className="single-question-header__breadcrumb-item single-question-header__breadcrumb-item--clickable"
          onClick={onShowSequenceLanding}
          aria-label={`Return to ${sequence.display_title || sequence.title}`}
        >
          {sequence.display_title || sequence.title}
        </button>
      );
    }

    // Activity level
    items.push(
      <span key="activity" className="single-question-header__breadcrumb-item">
        {activity.name}
      </span>
    );

    // Page level (if applicable)
    if (currentSlide?.pageName && currentSlide.pageIndex !== undefined) {
      const pageIndex = currentSlide.pageIndex;
      items.push(
        <button
          key="page"
          className="single-question-header__breadcrumb-item single-question-header__breadcrumb-item--clickable"
          onClick={() => onNavigateToPage?.(pageIndex)}
          aria-label={`Go to ${currentSlide.pageName}`}
        >
          {currentSlide.pageName}
        </button>
      );
    }

    // Section level (if applicable and has a name)
    if (currentSlide?.sectionName && currentSlide.sectionIndex !== undefined && currentSlide.pageIndex !== undefined) {
      const pageIndex = currentSlide.pageIndex;
      const sectionIndex = currentSlide.sectionIndex;
      items.push(
        <button
          key="section"
          className="single-question-header__breadcrumb-item single-question-header__breadcrumb-item--clickable"
          onClick={() => onNavigateToSection?.(pageIndex, sectionIndex)}
          aria-label={`Go to ${currentSlide.sectionName}`}
        >
          {currentSlide.sectionName}
        </button>
      );
    }

    return items;
  };

  const breadcrumbItems = renderBreadcrumb();

  return (
    <header className="single-question-header">
      {/* WCAG: Visually hidden h1 ensures proper heading hierarchy for screen readers */}
      <h1 className="visually-hidden">{activity.name}</h1>

      <div className="single-question-header__left">
        {projectLogo ? (
          <img src={projectLogo} alt="Project logo" className="single-question-header__logo" />
        ) : (
          <CCLogo className="single-question-header__logo single-question-header__logo--default" />
        )}
      </div>
      <div className="single-question-header__center">
        {/* WCAG: Breadcrumb navigation with proper landmark and structure */}
        <nav
          className="single-question-header__breadcrumb"
          aria-label="Breadcrumb"
        >
          <ol className="single-question-header__breadcrumb-list">
            {breadcrumbItems.map((item, index) => (
              <li key={index} className="single-question-header__breadcrumb-list-item">
                {index > 0 && (
                  <IconChevronRight
                    className="single-question-header__breadcrumb-separator"
                    width={12}
                    height={12}
                    aria-hidden="true"
                  />
                )}
                {index === breadcrumbItems.length - 1 ? (
                  <span aria-current="page">{item}</span>
                ) : (
                  item
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="single-question-header__right">
        <span className="single-question-header__username">{userName}</span>
      </div>
    </header>
  );
};
