
import React, { useContext } from "react";
import { queryValue } from "../utilities/url-query";

export const FontSizeContext = React.createContext<string>("16");
FontSizeContext.displayName = "FontSizeContext";

export const useFontSize = () => useContext(FontSizeContext);

export const getFontSizeQueryParam = () => {
  let fontSize = parseInt(queryValue("fontSize") || "16", 10);
  if (isNaN(fontSize)) {
    fontSize = 16;
  }
  return `${fontSize}px`;
};

