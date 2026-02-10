import { tokenVars } from "../../styles/variables/token.css";
import { themeVars } from "../../styles/variables/theme.css";
import { recipe } from "@vanilla-extract/recipes";
import { objEntries, objFromEntries } from "@simplysm/core-common";
import { globalStyle, style } from "@vanilla-extract/css";
const checkboxIndicator = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  borderRadius: tokenVars.radius.sm,
  border: `1px solid rgb(${themeVars.border.base})`,
  background: `rgb(${themeVars.surface.base})`,
  transition: `border-color ${tokenVars.duration.base} linear, background-color ${tokenVars.duration.base} linear`,
  width: "1em",
  height: "1em",
});
const checkboxIndicatorIcon = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  opacity: 0,
  transition: `opacity ${tokenVars.duration.base} linear`,
  selectors: {
    [`&[data-checked="true"], &[data-indeterminate="true"]`]: {
      opacity: 1,
    },
  },
});
const checkboxContents = style({
  selectors: {
    "&:empty": {
      display: "none",
    },
  },
});
const checkbox = recipe({
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
    indeterminate: {
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
    indeterminate: false,
  },
});
globalStyle(`${checkbox.classNames.base}:focus-within .${checkboxIndicator}`, {
  boxShadow: `0 0 0 2px rgb(${themeVars.control.primary.muted})`,
});
for (const [theme, color] of objEntries(themeVars.control)) {
  const checkedClass = checkbox.classNames.variants.checked.true;
  const themeClass = checkbox.classNames.variants.theme[theme];
  globalStyle(`${checkedClass}${themeClass} .${checkboxIndicator}`, {
    background: `rgb(${color.base})`,
    borderColor: `rgb(${color.base})`,
  });
  globalStyle(`${checkedClass}${themeClass} .${checkboxIndicatorIcon}`, {
    color: `rgb(${themeVars.text.inverted})`,
  });
  globalStyle(`${checkedClass}${themeClass}:focus-within .${checkboxIndicator}`, {
    boxShadow: `0 0 0 2px rgb(${color.muted})`,
  });
}
for (const [theme, color] of objEntries(themeVars.control)) {
  const indeterminateClass = checkbox.classNames.variants.indeterminate.true;
  const themeClass = checkbox.classNames.variants.theme[theme];
  globalStyle(`${indeterminateClass}${themeClass} .${checkboxIndicator}`, {
    background: `rgb(${color.base})`,
    borderColor: `rgb(${color.base})`,
  });
  globalStyle(`${indeterminateClass}${themeClass} .${checkboxIndicatorIcon}`, {
    color: `rgb(${themeVars.text.inverted})`,
  });
  globalStyle(`${indeterminateClass}${themeClass}:focus-within .${checkboxIndicator}`, {
    boxShadow: `0 0 0 2px rgb(${color.muted})`,
  });
}
export { checkbox, checkboxContents, checkboxIndicator, checkboxIndicatorIcon };
//# sourceMappingURL=checkbox.css.js.map
