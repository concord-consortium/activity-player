// src/components/single-question/slides/single-question-page-slide.tsx

import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import { renderHTML } from "../../../utilities/render-html";
import "./single-question-page-slide.scss";

interface IProps {
  pageName: string;
  pageText?: string | null;
  pageNumber: number;
}

export const SingleQuestionPageSlide: React.FC<IProps> = ({
  pageName,
  pageText,
  pageNumber,
}) => {
  return (
    <div className="single-question-page-slide">
      <div className="single-question-page-slide__number">
        Page {pageNumber}
      </div>
      <h2 className="single-question-page-slide__title">
        <DynamicText>{pageName}</DynamicText>
      </h2>
      {pageText && (
        <div className="single-question-page-slide__text">
          <DynamicText>{renderHTML(pageText)}</DynamicText>
        </div>
      )}
    </div>
  );
};
