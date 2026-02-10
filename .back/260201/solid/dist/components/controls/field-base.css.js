import { recipe } from "@vanilla-extract/recipes";
import { tokenVars } from "../../styles/variables/token.css";
import { themeVars } from "../../styles/variables/theme.css";
import { style } from "@vanilla-extract/css";
const fieldHeight = {
  sm: `calc(${tokenVars.font.size.sm} * ${tokenVars.font.lineHeight.normal} + ${tokenVars.spacing.xs} * 2 + 2px)`,
  base: `calc(${tokenVars.font.size.base} * ${tokenVars.font.lineHeight.normal} + ${tokenVars.spacing.sm} * 2 + 2px)`,
  lg: `calc(${tokenVars.font.size.lg} * ${tokenVars.font.lineHeight.normal} + ${tokenVars.spacing.base} * 2 + 2px)`,
};
const fieldBaseStyles = {
  display: "block",
  width: "100%",
  height: fieldHeight.base,
  padding: `${tokenVars.spacing.sm} ${tokenVars.spacing.base}`,
  border: `1px solid rgb(${themeVars.border.base})`,
  borderRadius: tokenVars.radius.base,
  background: `rgb(${themeVars.surface.base})`,
  color: `rgb(${themeVars.text.base})`,
  fontSize: tokenVars.font.size.base,
  transition: `${tokenVars.duration.base} linear`,
  transitionProperty: "border-color, box-shadow, background-color",
};
const fieldBaseSelectors = {
  "&:focus-within": {
    outline: "none",
  },
  "&:focus-visible": {
    background: `rgb(${themeVars.control.primary.muted})`,
  },
  "&:disabled": {
    opacity: tokenVars.overlay.muted,
    pointerEvents: "none",
  },
  "&[readonly]": {
    background: `rgb(${themeVars.surface.elevated})`,
  },
  "&::placeholder": {
    color: `rgb(${themeVars.text.muted})`,
  },
};
const fieldBaseVariants = {
  size: {
    sm: {
      height: fieldHeight.sm,
      padding: `${tokenVars.spacing.xs} ${tokenVars.spacing.sm}`,
      fontSize: tokenVars.font.size.sm,
    },
    lg: {
      height: fieldHeight.lg,
      padding: `${tokenVars.spacing.base} ${tokenVars.spacing.lg}`,
      fontSize: tokenVars.font.size.lg,
    },
  },
  inset: {
    true: {
      border: "none",
      borderRadius: 0,
      background: "transparent",
    },
  },
  inline: {
    true: {
      display: "inline-block",
      width: "auto",
    },
  },
};
const fieldBase = recipe({
  base: {
    ...fieldBaseStyles,
    selectors: fieldBaseSelectors,
  },
  variants: fieldBaseVariants,
  defaultVariants: {},
});
const fieldContainer = style({
  position: "relative",
  display: "inline-block",
});
const fieldContent = style({
  visibility: "hidden",
  whiteSpace: "pre",
  minWidth: "1rem",
});
const fieldInput = style({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: "100%",
  height: "100%",
});
export {
  fieldBase,
  fieldBaseSelectors,
  fieldBaseStyles,
  fieldBaseVariants,
  fieldContainer,
  fieldContent,
  fieldHeight,
  fieldInput,
};
//# sourceMappingURL=field-base.css.js.map
