import React from "react";
import { queryValue, queryValueBoolean } from "../../utilities/url-query";

import "./bottom-buttons.scss";

interface IProps {
  onGenerateReport: () => void;
}

export const BottomButtons: React.FC<IProps> = (props) => {
  const disableShowMyWorkButton = queryValueBoolean("preview") || queryValue("mode") === "teacher-edition";

  return (
    <div className="bottom-buttons">
      <button className={`button ${disableShowMyWorkButton ? "disabled" : ""}`}
              onClick={props.onGenerateReport}
              data-cy="bottom-button-report"
              tabIndex={1}>
        Show My Work
      </button>
    </div>
  );
};
