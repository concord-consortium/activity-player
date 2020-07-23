import React from "react";

import "../activity-page/bottom-buttons.scss";

interface SubmitButtonProps {
  onSubmit?: () => void;
}

export const SubmitButton: React.FC<SubmitButtonProps> = (props) => {
  return (
    <div className="bottom-buttons center">
      <div>
        <button className="button" onClick={props.onSubmit} data-cy="submit-button">Submit</button>
      </div>
    </div>
  );
};
