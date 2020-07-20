// cf. https://mattferderer.com/use-sass-variables-in-typescript-and-javascript
import colors from "../components/vars.scss";

// cf. https://stackoverflow.com/a/62640342
export const colorShade = (color: string, amt: number) => {
  color = color.replace(/^#/, "");
  if (color.length === 3) color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];

  let [r, g, b]: any = color.match(/.{2}/g);
  ([r, g, b] = [parseInt(r, 16) + amt, parseInt(g, 16) + amt, parseInt(b, 16) + amt]);

  r = Math.max(Math.min(255, r), 0).toString(16);
  g = Math.max(Math.min(255, g), 0).toString(16);
  b = Math.max(Math.min(255, b), 0).toString(16);

  const rr = (r.length < 2 ? "0" : "") + r;
  const gg = (g.length < 2 ? "0" : "") + g;
  const bb = (b.length < 2 ? "0" : "") + b;

  return `#${rr}${gg}${bb}`;
};

export const setThemeColors = (primary: string, secondary: string) => {
  document.documentElement.style.setProperty("--theme-primary-color", primary);
  document.documentElement.style.setProperty("--theme-primary-hover-color", colorShade(primary, -20));
  document.documentElement.style.setProperty("--theme-primary-active-color", colorShade(primary, -40));
  document.documentElement.style.setProperty("--theme-primary-text-color", getContrastYIQColor(primary));
  document.documentElement.style.setProperty("--theme-secondary-color", secondary);
  document.documentElement.style.setProperty("--theme-secondary-hover-color", colorShade(secondary, -20));
  document.documentElement.style.setProperty("--theme-secondary-active-color", colorShade(secondary, -40));
  document.documentElement.style.setProperty("--theme-secondary-text-color", getContrastYIQColor(secondary));
};

// cf. https://24ways.org/2010/calculating-color-contrast
const getContrastYIQColor = (color: string) => {
  color = color.replace(/^#/, "");
  if (color.length === 3) color = color[0] + color[0] + color[1] + color[1] + color[2] + color[2];
  const r = parseInt(color.substr(0,2),16);
  const g = parseInt(color.substr(2,2),16);
  const b = parseInt(color.substr(4,2),16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? colors.darkFontColor : colors.lightFontColor;
};
