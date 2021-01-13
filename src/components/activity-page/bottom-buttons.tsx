import React from "react";

import "./bottom-buttons.scss";

interface IProps {
  onGenerateReport: () => void;
}

export const BottomButtons: React.FC<IProps> = (props) => {
  return (
    <div className="bottom-buttons">
      <button className="button"
              onClick={props.onGenerateReport}
              data-cy="bottom-button-report"
              tabIndex={1}>
        Show My Work
      </button>
    </div>
  );
};
