import React from "react";

import "./defunct-banner.scss";

export const DefunctBanner: React.FC = () => {
  return (
    <div className="defunct-banner">
      WARNING: This resource contains obsolete features that are no longer supported. Questions? Please email <a href="mailto:webmaster@concord.org">webmaster@concord.org</a>.
    </div>
  );
};
