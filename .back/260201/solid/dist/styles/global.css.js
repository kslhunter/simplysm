import { globalStyle } from "@vanilla-extract/css";
import { tokenVars } from "./variables/token.css";
import { themeVars } from "./variables/theme.css";
globalStyle("*, *:before, *:after", {
  boxSizing: "border-box",
  outlineColor: `rgb(${themeVars.control.primary.base})`,
  WebkitTapHighlightColor: "transparent",
  touchAction: "manipulation",
});
globalStyle("*:focus:not(:focus-visible)", {
  outline: "none",
});
globalStyle("*:focus-visible", {
  outline: `2px solid rgb(${themeVars.control.primary.base})`,
  outlineOffset: "2px",
});
globalStyle("html, body, #root", {
  height: "100%",
  width: "100%",
  padding: "0",
  margin: "0",
});
globalStyle("html", {
  fontSize: "12px",
});
globalStyle("body", {
  background: `rgb(${themeVars.surface.base})`,
  color: `rgb(${themeVars.text.base})`,
  fontFamily: tokenVars.font.family.sans,
  fontVariantNumeric: "tabular-nums",
  fontSize: tokenVars.font.size.base,
  lineHeight: tokenVars.font.lineHeight.normal,
});
globalStyle("*::-webkit-scrollbar", {
  width: "12px",
  height: "12px",
  borderRadius: "8px",
});
globalStyle("*::-webkit-scrollbar-thumb", {
  backgroundColor: `rgb(${themeVars.control.gray.base})`,
  borderRadius: "8px",
  backgroundClip: "padding-box",
  border: "2px solid transparent",
});
globalStyle("*::-webkit-scrollbar-track:hover", {
  backgroundColor: `rgb(${themeVars.surface.elevated})`,
  borderRadius: "8px",
  backgroundClip: "padding-box",
  border: "2px solid transparent",
});
globalStyle("*::-webkit-scrollbar-corner", {
  background: "transparent",
});
globalStyle("input, button, textarea, select", {
  color: "inherit",
  fontFamily: "inherit",
  fontVariantNumeric: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit",
});
globalStyle("svg.tabler-icon[width='24']", {
  width: "1lh",
  height: "1lh",
});
globalStyle("*", {
  verticalAlign: "top",
});
const headings = ["h1", "h2", "h3", "h4", "h5", "h6"];
for (const h of headings) {
  globalStyle(h, {
    fontSize: tokenVars.font.size[h],
    lineHeight: tokenVars.font.lineHeight.normal,
  });
}
//# sourceMappingURL=global.css.js.map
