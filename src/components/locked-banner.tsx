import React from "react";

import "./locked-banner.scss";

interface Props {
  isSequence: boolean;
}

export const LockedBanner: React.FC<Props> = ({ isSequence }) => {
  return (
    <div className="locked-banner">
      🔒 WARNING: This {isSequence ? "sequence" : "activity"} is locked.  No changes are allowed.
    </div>
  );
};
