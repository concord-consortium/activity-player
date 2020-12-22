import React from "react";
import { showReport } from "../../utilities/report-utils";

import "../activity-page/bottom-buttons.scss";

export const SubmitButton: React.FC = () => {
  return (
    <div className="bottom-buttons center">
      <div>
        <button className="button" onClick={showReport} data-cy="submit-button">Submit</button>
      </div>
    </div>
  );
};
