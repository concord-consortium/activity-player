import React from "react";

import "./warning-banner.scss";

export const WarningBanner: React.FC = () => {
  return (
    <div className="warning-banner">
      <div className="inner">
        <div>
          WARNING: The activity player is using a test database. Your data could be deleted at any time.
        </div>
      </div>
    </div>
  );
};
