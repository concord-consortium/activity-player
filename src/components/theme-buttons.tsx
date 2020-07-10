// This component is designed for demoing theme color changes
// and is not intended to be displayed in a production release.
// Add this component to enable buttons to toggle color theme.
import React from "react";
import { setThemeColors } from "../utilities/theme-utils";

import "./theme-buttons.scss";

export const ThemeButtons: React.FC = () => {
  const handleTealTheme = () => {
    setThemeColors("#0592af", "#ff8415");
  };
  const handleOrangeTheme = () => {
    setThemeColors("#ff8415", "#0592af");
  };
  const handleCBioTheme = () => {
    setThemeColors("#008fd7", "#f15a24");
  };
  const handleWatersTheme = () => {
    setThemeColors("#007c8B", "#e86e2f");
  };
  const handleInteractionsTheme = () => {
    setThemeColors("#414546", "#2f70b0");
  };
  return (
    <div className="theme-buttons">
      <button className="button" onClick={handleTealTheme}>teal</button>
      <button className="button" onClick={handleOrangeTheme}>orange</button>
      <button className="button" onClick={handleCBioTheme}>cbio</button>
      <button className="button" onClick={handleWatersTheme}>waters</button>
      <button className="button" onClick={handleInteractionsTheme}>interactions</button>
    </div>
  );
};
