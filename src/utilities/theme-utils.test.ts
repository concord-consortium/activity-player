import { colorShade, setThemeColors } from "./theme-utils";
import colors from "../components/vars.scss";

describe("Theme utility functions", () => {
  it("determines if color shades are computed", () => {
    const redShade1 = colorShade("#FF0000", -20);
    const redShade2 = colorShade("#FF0000", -40);
    const redShade3 = colorShade("#FF0000", -60);
    expect(redShade1).toBe("#eb0000");
    expect(redShade2).toBe("#d70000");
    expect(redShade3).toBe("#c30000");
  });
  it("determines if theme colors are set", () => {
    setThemeColors("#ff8415", "#0592af");
    const primary = document.documentElement.style.getPropertyValue("--theme-primary-color");
    const primaryHover = document.documentElement.style.getPropertyValue("--theme-primary-hover-color");
    const primaryActive = document.documentElement.style.getPropertyValue("--theme-primary-active-color");
    const primaryText = document.documentElement.style.getPropertyValue("--theme-primary-text-color");
    const secondary = document.documentElement.style.getPropertyValue("--theme-secondary-color");
    const secondaryHover = document.documentElement.style.getPropertyValue("--theme-secondary-hover-color");
    const secondaryActive = document.documentElement.style.getPropertyValue("--theme-secondary-active-color");
    const secondaryText = document.documentElement.style.getPropertyValue("--theme-secondary-text-color");
    expect(primary).toBe("#ff8415");
    expect(primaryHover).toBe("#eb7001");
    expect(primaryActive).toBe("#d75c00");
    expect(primaryText).toBe(colors.darkFontColor);
    expect(secondary).toBe("#0592af");
    expect(secondaryHover).toBe("#007e9b");
    expect(secondaryActive).toBe("#006a87");
    expect(secondaryText).toBe(colors.lightFontColor);
  });

});
