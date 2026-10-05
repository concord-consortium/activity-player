import React, { useEffect, useState } from "react";
import { EmbeddableVisibilityContext } from "../embeddable-visibility-context";
import { EmbeddableVisibilityTracker } from "../../utilities/embeddable-visibility-tracker";

// Mount one per page: mounting reports a pageChange and unmounting ends the page's logging.
export const EmbeddableVisibilityProvider: React.FC = ({ children }) => {
  const [tracker] = useState(() => new EmbeddableVisibilityTracker());
  useEffect(() => {
    tracker.start();
    return () => tracker.dispose();
  }, [tracker]);
  return <EmbeddableVisibilityContext.Provider value={tracker}>{children}</EmbeddableVisibilityContext.Provider>;
};
