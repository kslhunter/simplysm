import { globalStyle, style } from "@vanilla-extract/css";
import { themeVars } from "@simplysm/solid/styles";

export const demoTable = style({
  borderCollapse: "collapse",
});

globalStyle(`${demoTable} td, ${demoTable} th`, {
  border: `1px solid rgb(${themeVars.border.base})`,
  padding: "0",
});
