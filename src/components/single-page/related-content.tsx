import React from "react";
import { renderHTML } from "../../utilities/render-html";

import "./related-content.scss";

interface RelatedContentProps {
  relatedContentText: string;
}

export const RelatedContent: React.FC<RelatedContentProps> = (props) => {
  return (
    <div className="related-content" data-cy="related-content">
      <div className="header" data-cy="related-content-header">Related activities</div>
      <div className="related-content-text" data-cy="related-content-text">
        { renderHTML(props.relatedContentText) }
      </div>
    </div>
  );
};
