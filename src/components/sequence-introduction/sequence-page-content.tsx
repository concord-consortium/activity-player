import { DynamicText } from "@concord-consortium/dynamic-text";
import React from "react";
import { Activity, Sequence } from "../../types";
import { renderHTML } from "../../utilities/render-html";
import { EstimatedTime } from "../activity-introduction/estimated-time";
import { ReadAloudToggle } from "../read-aloud-toggle";

import "./sequence-page-content.scss";

interface IProps {
  sequence: Sequence;
  onSelectActivity: (page: number) => void;
}

export const SequencePageContent: React.FC<IProps> = (props) => {
  const { onSelectActivity, sequence } = props;
  let totalTime = 0;
  let stubCount = 0;
  sequence.activities.forEach((a: Activity) => totalTime += a.time_to_complete || 0);

  return (
    <div className="sequence-content" data-cy="sequence-page-content">
      <div className="introduction">
        <div className="sequence-header">
          <div className="sequence-title">
            <h2><DynamicText>{sequence.display_title || sequence.title || ""}</DynamicText></h2>
          </div>
          <ReadAloudToggle/>
        </div>
        <div className="description">{ sequence.description && renderHTML(sequence.description) }</div>
        <EstimatedTime time={totalTime} />
        <div className="thumb-holder">
          {sequence.activities.map((a: Activity, index: number) => {
            if (!a.thumbnail_url) {
              stubCount++;
            }
            return (
            <div className="thumb" key={`activity-${index}`} onClick={() => onSelectActivity(index)} data-cy="sequence-thumb">
              <div className="name">
                <div className="num">{`${index + 1}.`}</div>
                <div>{a.name}</div>
              </div>
              {a.thumbnail_url ? <img src={a.thumbnail_url} /> : <div className={`image-stub color-${(stubCount - 1) % 5 + 1}`} />}
            </div>
            );})
          }
        </div>
      </div>
    </div>
  );
};
