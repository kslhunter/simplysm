import { globalStyle } from "@vanilla-extract/css";
import { themeVars } from "../../styles/variables/theme.css";
import { recipe } from "@vanilla-extract/recipes";
import { tokenVars } from "../../styles/variables/token.css";
const list = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    userSelect: "none",
    background: `rgb(${themeVars.surface.elevated})`,
    borderRadius: tokenVars.radius.base,
    border: `1px solid rgb(${themeVars.border.base})`,
  },
  variants: {
    inset: {
      true: {
        background: "transparent",
        border: "none",
        borderRadius: `0`,
      },
    },
  },
});
globalStyle(`${list.classNames.base} ${list.classNames.base}`, {
  border: "none",
  background: "transparent",
});
globalStyle(`${list.classNames.variants.inset} ${list.classNames.base}`, {
  background: "transparent",
});
export { list };
//# sourceMappingURL=list.css.js.map
