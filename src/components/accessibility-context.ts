import React, { useContext } from "react";
import { Activity, Sequence } from "../types";
import { ActivityLayoutOverrides, ActivityLayouts } from "../utilities/activity-utils";


export type FontSize = "normal" | "large";
export type FontType = "normal" | "notebook";

export interface IAccessibility {
  fontSize: FontSize;
  fontSizeInPx: number;
  fontType: FontType;
  fontFamilyForType: string;
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

export const getFamilyForFontType = (fontType: FontType) => {
  const baseFontFamily = "'Lato', arial, helvetica, sans-serif;";
  if (fontType === "notebook") {
    return `'Andika', ${baseFontFamily}`;
  }
  return baseFontFamily;
};

export const getFontSize = ({activity, sequence}: {activity?: Activity, sequence?: Sequence}) => {
  // sequence font size overrides activity font size
  return normalizeFontSize(sequence?.font_size || activity?.font_size);
};

export const getFontType = ({activity, sequence}: {activity?: Activity, sequence?: Sequence}) => {
  let fontType: FontType = "normal";
  if (sequence?.layout_override === ActivityLayoutOverrides.Notebook || activity?.layout === ActivityLayouts.Notebook) {
    fontType = "notebook";
  }
  return fontType;
};

export const AccessibilityContext = React.createContext<IAccessibility>({
  fontSize: "normal",
  fontSizeInPx: getFontSizeInPx("normal"),
  fontType: "normal",
  fontFamilyForType: getFamilyForFontType("normal")
});
AccessibilityContext.displayName = "AccessibiltyContext";

export const useAccessibility = () => useContext(AccessibilityContext);
