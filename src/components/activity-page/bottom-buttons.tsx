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
        { <button className="button" 
                  disabled={!props.onBack} 
                  onClick={props.onBack} 
                  data-cy="bottom-button-back"
                  tabIndex={1}>
            {"< Back"}
          </button> }
      </div>
      <div>
        { props.onGenerateReport && 
          <button className="button" 
                  onClick={props.onGenerateReport} 
                  data-cy="bottom-button-report"
                  tabIndex={1}>
            {"Generate Report"}
          </button>
        }
      </div>
      <div>
        { <button className="button" 
                  disabled={!props.onNext} 
                  onClick={props.onNext} 
                  data-cy="bottom-button-next"
                  tabIndex={1}>
            {"Next >"}
          </button> 
        }
      </div>
    </div>
  );
};
