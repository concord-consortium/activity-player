import React from "react";
import { IEmbeddableVisibilityTracker } from "../utilities/embeddable-visibility-tracker";

// Undefined outside a page root, where embeddables are not measured.
export const EmbeddableVisibilityContext = React.createContext<IEmbeddableVisibilityTracker | undefined>(undefined);
EmbeddableVisibilityContext.displayName = "EmbeddableVisibilityContext";
