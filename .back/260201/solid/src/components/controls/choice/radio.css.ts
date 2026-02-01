import { tokenVars } from "../../../styles/variables/token.css";
import { themeVars } from "../../../styles/variables/theme.css";
import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { objEntries, objFromEntries } from "@simplysm/core-common";
import { globalStyle, style } from "@vanilla-extract/css";

export const radio = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokenVars.spacing.sm,
    cursor: "pointer",
    userSelect: "none",
    transition: `${tokenVars.duration.base} linear`,

    padding: `${tokenVars.spacing.sm} ${tokenVars.spacing.lg}`,
    border: `1px solid transparent`,
    borderRadius: tokenVars.radius.base,

    selectors: {
      "&:focus-within": {
        outline: "none",
      },
    },
  },
  variants: {
    theme: objFromEntries(objEntries(themeVars.control).map(([theme]) => [theme, {}])),
    checked: {
      true: {},
      false: {},
    },
    size: {
      xs: {
        fontSize: tokenVars.font.size.sm,
        padding: `${tokenVars.spacing.xxs} ${tokenVars.spacing.sm}`,
      },
      sm: {
        padding: `${tokenVars.spacing.xs} ${tokenVars.spacing.base}`,
      },
      lg: {
        padding: `${tokenVars.spacing.base} ${tokenVars.spacing.xl}`,
      },
      xl: {
        fontSize: tokenVars.font.size.lg,
        padding: `${tokenVars.spacing.lg} ${tokenVars.spacing.xxl}`,
      },
    },
    inline: {
      true: {
        verticalAlign: "middle",
        padding: 0,
        border: "none",
      },
    },
    inset: {
      true: {
        border: "none",
        borderRadius: 0,
        justifyContent: "center",
      },
    },
    disabled: {
      true: {
        opacity: tokenVars.overlay.muted,
        pointerEvents: "none",
        cursor: "default",
      },
    },
  },
  defaultVariants: {
    theme: "primary",
    checked: false,
  },
});

export const radioIndicator = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: tokenVars.radius.full,
  border: `1px solid rgb(${themeVars.border.base})`,
  background: `rgb(${themeVars.surface.base})`,
  transition: `border-color ${tokenVars.duration.base} linear, background-color ${tokenVars.duration.base} linear`,
  width: "1em",
  height: "1em",
});

export const radioInnerDot = style({
  width: "0.5em",
  height: "0.5em",
  borderRadius: tokenVars.radius.full,
  background: `rgb(${themeVars.text.inverted})`,
  transform: "scale(0)",
  opacity: 0,
  transition: `${tokenVars.duration.base} linear`,
  transitionProperty: "transform, opacity",
});

export const radioContents = style({
  selectors: {
    "&:empty": {
      display: "none",
    },
  },
});

// 기본 focus 스타일
globalStyle(`${radio.classNames.base}:focus-within .${radioIndicator}`, {
  boxShadow: `0 0 0 2px rgb(${themeVars.control.primary.muted})`,
});

// checked 시 innerDot 표시
globalStyle(`${radio.classNames.variants.checked.true} .${radioInnerDot}`, {
  transform: "scale(1)",
  opacity: 1,
});

// theme + checked 조합 스타일
for (const [theme, color] of objEntries(themeVars.control)) {
  const checkedClass = radio.classNames.variants.checked.true;
  const themeClass = radio.classNames.variants.theme[theme];

  globalStyle(`${checkedClass}${themeClass} .${radioIndicator}`, {
    background: `rgb(${color.base})`,
    borderColor: `rgb(${color.base})`,
  });

  globalStyle(`${checkedClass}${themeClass}:focus-within .${radioIndicator}`, {
    boxShadow: `0 0 0 2px rgb(${color.muted})`,
  });
}

export type RadioStyles = NonNullable<RecipeVariants<typeof radio>>;
