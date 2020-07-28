import React from "react";

import "./bottom-buttons.scss";

interface BottomButtonProps {
  onBack?: () => void;
  onNext?: () => void;
  onGenerateReport?: () => void;
}

export const BottomButtons: React.FC<BottomButtonProps> = (props) => {
  return (
    <div className="bottom-buttons">
      <div>
        { props.onBack && <button className="button" onClick={props.onBack} data-cy="bottom-button-back">{"< Back"}</button> }
      </div>
      <div>
        { props.onGenerateReport && <button className="button" onClick={props.onGenerateReport} data-cy="bottom-button-report">{"Generate Report"}</button> }
      </div>
      <div>
        { props.onNext && <button className="button" onClick={props.onNext} data-cy="bottom-button-next">{"Next >"}</button> }
      </div>
    </div>
  );
};
