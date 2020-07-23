import React from "react";
import { renderHTML } from "../../utilities/render-html";

import "./related-content.scss";

interface RelatedContentProps {
  relatedContentText: string;
}

export const RelatedContent: React.FC<RelatedContentProps> = (props) => {
  return (
    <div className="related-content">
      <div className="header">Related activities</div>
      <div className="related-content-text">
        { renderHTML(props.relatedContentText) }
      </div>
    </div>
  );
};
