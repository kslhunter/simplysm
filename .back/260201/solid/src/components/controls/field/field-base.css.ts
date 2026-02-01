import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { tokenVars } from "../../../styles/variables/token.css";
import { themeVars } from "../../../styles/variables/theme.css";
import { style } from "@vanilla-extract/css";

/**
 * Field 높이 계산: fontSize * lineHeight + paddingY * 2 + border * 2
 */
export const fieldHeight = {
  sm: `calc(${tokenVars.font.size.sm} * ${tokenVars.font.lineHeight.normal} + ${tokenVars.spacing.xs} * 2 + 2px)`,
  base: `calc(${tokenVars.font.size.base} * ${tokenVars.font.lineHeight.normal} + ${tokenVars.spacing.sm} * 2 + 2px)`,
  lg: `calc(${tokenVars.font.size.lg} * ${tokenVars.font.lineHeight.normal} + ${tokenVars.spacing.base} * 2 + 2px)`,
};

/**
 * 공통 base 스타일 (확장용)
 */
export const fieldBaseStyles = {
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
} as const;

/**
 * 공통 selectors (확장용)
 */
export const fieldBaseSelectors = {
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
} as const;

/**
 * 공통 variants (확장용)
 */
export const fieldBaseVariants = {
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
} as const;

/**
 * 모든 Field 컴포넌트가 공유하는 base recipe
 */
export const fieldBase = recipe({
  base: {
    ...fieldBaseStyles,
    selectors: fieldBaseSelectors,
  },
  variants: fieldBaseVariants,
  defaultVariants: {},
});

export type FieldBaseStyles = NonNullable<RecipeVariants<typeof fieldBase>>;

/**
 * inset 모드용 컨테이너 스타일
 */
export const fieldContainer = style({
  position: "relative",
  display: "inline-block",
});

/**
 * inset 모드의 content 영역 (너비 결정용)
 */
export const fieldContent = style({
  visibility: "hidden",
  whiteSpace: "pre",
  minWidth: "1rem",
});

/**
 * inset 모드의 input 영역 (absolute positioned)
 */
export const fieldInput = style({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: "100%",
  height: "100%",
});
