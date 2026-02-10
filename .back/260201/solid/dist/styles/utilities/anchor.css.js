import { recipe } from "@vanilla-extract/recipes";
import { themeVars } from "../variables/theme.css";
import { tokenVars } from "../variables/token.css";
import { objEntries, objFromEntries } from "@simplysm/core-common";
const anchorStyles = recipe({
  base: {
    display: "inline",
    cursor: "pointer",
    textDecoration: "none",
    transition: `color ${tokenVars.duration.base} linear`,
    selectors: {
      "&:hover, &:focus-visible": {
        textDecoration: "underline",
      },
      "&[data-disabled='true']": {
        opacity: tokenVars.overlay.muted,
        pointerEvents: "none",
        cursor: "default",
      },
    },
  },
  variants: {
    theme: objFromEntries(
      objEntries(themeVars.control).map(([theme, color]) => [
        theme,
        {
          color: `rgb(${color.base})`,
          selectors: {
            "&:hover, &:focus-visible": {
              color: `rgb(${color.hover})`,
            },
          },
        },
      ]),
    ),
  },
  defaultVariants: {
    theme: "primary",
  },
});
export { anchorStyles };
//# sourceMappingURL=anchor.css.js.map
