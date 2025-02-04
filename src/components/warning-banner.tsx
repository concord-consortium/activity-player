import React from "react";

import "./warning-banner.scss";

export const WarningBanner: React.FC = () => {
  return (
    <div className="warning-banner">
      WARNING: You are using the test database. Your data could be deleted at any time.
    </div>
  );
};
