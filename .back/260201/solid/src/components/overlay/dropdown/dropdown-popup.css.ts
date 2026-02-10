import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { keyframes, style } from "@vanilla-extract/css";
import { tokenVars } from "../../../styles/variables/token.css";
import { themeVars } from "../../../styles/variables/theme.css";

const slideDown = keyframes({
  from: {
    opacity: 0,
    transform: "translateY(-0.5rem)",
  },
  to: {
    opacity: 1,
    transform: "translateY(0)",
  },
});

const slideUp = keyframes({
  from: {
    opacity: 0,
    transform: "translateY(0.5rem)",
  },
  to: {
    opacity: 1,
    transform: "translateY(0)",
  },
});

const slideFromBottom = keyframes({
  from: {
    transform: "translateY(100%)",
  },
  to: {
    transform: "translateY(0)",
  },
});

export const dropdownPopup = recipe({
  base: {
    "position": "fixed",
    "zIndex": tokenVars.zIndex.dropdown,
    "background": `rgb(${themeVars.surface.base})`,
    "minWidth": "7.5rem",
    "boxShadow": tokenVars.shadow.xl,
    "overflow": "hidden",
    "borderRadius": tokenVars.radius.base,
    "border": `1px solid rgb(${themeVars.border.muted})`,
    "outline": "none",

    "@media": {
      "(max-width: 520px)": {
        boxShadow: "none",
        border: `1px solid rgb(${themeVars.border.base})`,
      },
    },
  },
  variants: {
    placement: {
      bottom: {
        animation: `${slideDown} ${tokenVars.duration.base} ease-out`,
      },
      top: {
        animation: `${slideUp} ${tokenVars.duration.base} ease-out`,
      },
    },
    mobile: {
      true: {
        position: "fixed",
        left: "0 !important",
        right: "0 !important",
        bottom: "0 !important",
        top: "auto !important",
        width: "100%",
        maxHeight: "80vh",
        borderRadius: `${tokenVars.radius.xl} ${tokenVars.radius.xl} 0 0`,
        animation: `${slideFromBottom} ${tokenVars.duration.base} ease-out`,
      },
    },
  },
});

export const dropdownPopupContent = style({
  "width": "100%",
  "maxHeight": "18.75rem",
  "overflow": "auto",
  "whiteSpace": "nowrap",

  "@media": {
    "(max-width: 520px)": {
      maxHeight: "none",
    },
  },
});

export const backdrop = style({
  position: "fixed",
  inset: 0,
  zIndex: tokenVars.zIndex.backdrop,
  background: `rgba(${themeVars.surface.inverted} / ${tokenVars.overlay.muted})`,
});

export const mobileHandle = style({
  "display": "flex",
  "justifyContent": "center",
  "padding": tokenVars.spacing.base,
  "cursor": "grab",

  "::after": {
    content: '""',
    width: "2.5rem",
    height: "0.25rem",
    borderRadius: tokenVars.radius.full,
    background: `rgb(${themeVars.border.base})`,
  },
});

export type DropdownPopupStyles = NonNullable<RecipeVariants<typeof dropdownPopup>>;
