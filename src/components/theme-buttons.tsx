// This component is designed for demoing theme color changes
// and is not intended to be displayed in a production release.
// Add this component to enable buttons to toggle color theme.
import React from "react";
import { setAppBackgroundImage } from "../utilities/activity-utils";
import { setThemeColors } from "../utilities/theme-utils";
import colors from "../components/vars.scss";
import "./theme-buttons.scss";

interface ITheme {
  id: string;
  label: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundImage?: string;
}
const kThemes: ITheme[] = [
  {
    id: "teal",
    label: "Teal",
    primaryColor: "#0592af",
    secondaryColor: "#ff8415"
  },
  {
    id: "orange",
    label: "Orange",
    primaryColor: "#ff8415",
    secondaryColor: "#0592af"
  },
  {
    id: "cbio",
    label: "CBio",
    primaryColor: "#008fd7",
    secondaryColor: "#f15a24"
  },
  {
    id: "waters",
    label: "Waters",
    primaryColor: "#007c8B",
    secondaryColor: "#e86e2f"
  },
  {
    id: "interactions",
    label: "Interactions",
    primaryColor: "#414546",
    secondaryColor: "#2f70b0"
  },
  {
    id: "image",
    label: "Image",
    backgroundImage: `url("https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Hubble%27s_Wide_View_of_%27Mystic_Mountain%27_in_Infrared.jpg/678px-Hubble%27s_Wide_View_of_%27Mystic_Mountain%27_in_Infrared.jpg")`
  }
];
const kThemeMap: Record<string, ITheme> = {};
kThemes.forEach(theme => kThemeMap[theme.id] = theme);

export const ThemeButtons: React.FC = () => {

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.target as HTMLButtonElement;
    const id = button.dataset.id;
    const theme = id ? kThemeMap[id] : undefined;
    if (theme) {
      if (theme.primaryColor && theme.secondaryColor) {
        setThemeColors(theme.primaryColor, theme.secondaryColor);
      }
      setAppBackgroundImage(theme.backgroundImage);
    }
  };

  return (
    <div className="theme-buttons" data-cy="theme-buttons">
      {kThemes.map(theme => (
        <button className="button" key={theme.id} onClick={handleClick}
                data-id={theme.id} data-cy={`theme-button-${theme.id}`}
                data-light-text-color={colors.lightFontColor}
                data-dark-text-color={colors.darkFontColor} >
          {theme.label}
        </button>
      ))}
    </div>
  );
};
