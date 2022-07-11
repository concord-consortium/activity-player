import React from "react";
import { isValidReportLink } from "../../utilities/report-utils";

import "./bottom-buttons.scss";

interface IProps {
  onGenerateReport: () => void;
}

export const BottomButtons: React.FC<IProps> = (props) => {
  const hasValidReportLink = isValidReportLink();
  return (
    <div className="bottom-buttons">
      <button className={`button ${hasValidReportLink ? "" : "disabled"}`}
              onClick={props.onGenerateReport}
              data-cy="bottom-button-report"
              tabIndex={1}>
        Show My Work
      </button>
    </div>
  );
};
