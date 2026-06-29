import React from "react";
import { renderHTML } from "../../utilities/render-html";

import "./related-content.scss";

interface RelatedContentProps {
  relatedContentText: string;
}

export const RelatedContent: React.FC<RelatedContentProps> = (props) => {
  return (
    <div className="related-content" data-cy="related-content">
      <h2 className="header" data-cy="related-content-header">Related activities</h2>
      <div className="related-content-text" data-cy="related-content-text">
        { renderHTML(props.relatedContentText) }
      </div>
    </div>
  );
};
