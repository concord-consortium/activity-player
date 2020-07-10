// example from:
// https://stackoverflow.com/a/62640342
export const colorShade = (col: string, amt: number) => {
  col = col.replace(/^#/, "");
  if (col.length === 3) col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];

  let [r, g, b]: any = col.match(/.{2}/g);
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
  document.documentElement.style.setProperty("--theme-secondary-color", secondary);
  document.documentElement.style.setProperty("--theme-secondary-hover-color", colorShade(secondary, -20));
  document.documentElement.style.setProperty("--theme-secondary-active-color", colorShade(secondary, -40));
};
