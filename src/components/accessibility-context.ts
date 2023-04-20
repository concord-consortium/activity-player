import React, { useContext } from "react";
import { Activity, Sequence } from "../types";


export type FontSize = "normal" | "large";

export interface IAccessibility {
  fontSize: FontSize;
  fontSizeInPx: number;
}

export const normalizeFontSize = (fontSize?: string): FontSize => {
  if (fontSize === "large") {
    return "large";
  }
  return "normal";
};

export const getFontSizeInPx = (fontSize: FontSize) => {
  if (fontSize === "large") {
    return 22;
  }
  return 16;
};

export const getFontSize = ({activity, sequence}: {activity?: Activity, sequence?: Sequence}) => {
  // sequence font size overrides activity font size
  return normalizeFontSize(sequence?.font_size || activity?.font_size);
};

export const AccessibilityContext = React.createContext<IAccessibility>({fontSize: "normal", fontSizeInPx: getFontSizeInPx("normal")});
AccessibilityContext.displayName = "AccessibiltyContext";

export const useAccessibility = () => useContext(AccessibilityContext);
