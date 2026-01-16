// src/components/single-question/slides/single-question-section-slide.tsx

import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import "./single-question-section-slide.scss";

interface IProps {
  sectionName: string;
  pageName?: string | null;
}

export const SingleQuestionSectionSlide: React.FC<IProps> = ({
  sectionName,
  pageName,
}) => {
  return (
    <div className="single-question-section-slide">
      {pageName && (
        <div className="single-question-section-slide__page-context">
          {pageName}
        </div>
      )}
      <h3 className="single-question-section-slide__title">
        <DynamicText>{sectionName}</DynamicText>
      </h3>
    </div>
  );
};
