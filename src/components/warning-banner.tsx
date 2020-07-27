import React from "react";

import "./warning-banner.scss";

export const WarningBanner: React.FC = () => {
  return (
    <div className="warning-banner">
      WARNING: This activity player is a prototype, this URL will not work in the future, and your data will not be saved. This preview is for testing purposes only.
    </div>
  );
};
