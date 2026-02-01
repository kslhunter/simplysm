import { tokenVars } from "../../../styles/variables/token.css";
import { themeVars } from "../../../styles/variables/theme.css";
import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { objEntries, objFromEntries, objMap } from "@simplysm/core-common";
import { style } from "@vanilla-extract/css";

export const checkbox = recipe({
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: tokenVars.spacing.sm,
    cursor: "pointer",
    userSelect: "none",

    padding: `${tokenVars.spacing.sm} ${tokenVars.spacing.lg}`,
    border: `1px solid transparent`,
    borderRadius: tokenVars.radius.base,
  },
  variants: {
    theme: objFromEntries(objEntries(themeVars.control).map(([theme]) => [theme, {}])),
    value: {
      "true": {},
      "false": {},
      "-": {},
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
    value: false,
  },
});

const checkboxClass = checkbox.classNames.base;
const checkedClass = checkbox.classNames.variants.value.true;
const indeterminatedClass = checkbox.classNames.variants.value["-"];

export const checkboxIndicator = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: tokenVars.radius.sm,
  border: `1px solid rgb(${themeVars.border.base})`,
  background: `rgb(${themeVars.surface.base})`,
  transition: `${tokenVars.duration.base} linear`,
  transitionProperty: "border-color, background-color, color",
  width: "1em",
  height: "1em",
  selectors: {
    [`${checkboxClass}:focus &`]: {
      boxShadow: `0 0 0 2px rgb(${themeVars.control.primary.muted})`,
    },
    ...objMap(themeVars.control, (theme, color) => {
      const themeClass = checkbox.classNames.variants.theme[theme];

      return [
        `${checkedClass}${themeClass} &`,
        {
          background: `rgb(${color.base})`,
          borderColor: `rgb(${color.base})`,
          color: `rgb(${themeVars.text.inverted})`,
        },
      ];
    }),
    ...objMap(themeVars.control, (theme, color) => {
      const themeClass = checkbox.classNames.variants.theme[theme];

      return [
        `${indeterminatedClass}${themeClass} &`,
        {
          background: `rgb(${color.base})`,
          borderColor: `rgb(${color.base})`,
          color: `rgb(${themeVars.text.inverted})`,
        },
      ];
    }),
  },
});

export const checkboxIndicatorIcon = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  opacity: 0,
  transition: `opacity ${tokenVars.duration.base} linear`,
  selectors: {
    [`${checkedClass} &`]: {
      opacity: 1,
    },
    [`${indeterminatedClass} &`]: {
      opacity: 1,
    },
  },
});

export const checkboxContents = style({
  selectors: {
    "&:empty": {
      display: "none",
    },
  },
});

export type CheckboxStyles = NonNullable<RecipeVariants<typeof checkbox>>;
