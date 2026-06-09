import React from "react";

import { getWildfireBranch } from "../utilities/wildfire";

import "./wildfire-banner.scss";

export const WildfireBanner: React.FC = () => {
  const branch = getWildfireBranch();
  return (
    <div className="wildfire-banner" data-cy="wildfire-banner">
      🔥 Wildfire branch: <strong>{branch}</strong>
    </div>
  );
};
