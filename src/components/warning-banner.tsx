import React from "react";

import "./warning-banner.scss";

export const WarningBanner: React.FC = () => {
  return (
    <div className="warning-banner">
      WARNING: The activity player is storing data in a test database. Your data could be deleted at any time.
    </div>
  );
};
