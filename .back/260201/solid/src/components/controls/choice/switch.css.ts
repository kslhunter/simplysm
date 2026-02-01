import { tokenVars } from "../../../styles/variables/token.css";
import { themeVars } from "../../../styles/variables/theme.css";
import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { objEntries, objFromEntries } from "@simplysm/core-common";
import { globalStyle, style } from "@vanilla-extract/css";

export const switchStyle = recipe({
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
    disabled: false,
  },
});

export const switchTrack = style({
  display: "inline-flex",
  alignItems: "center",
  flexShrink: 0,
  position: "relative",
  width: "2em",
  height: "1em",
  borderRadius: "0.5em",
  background: `rgb(${themeVars.surface.muted})`,
  border: `1px solid rgb(${themeVars.border.base})`,
  transition: `background-color ${tokenVars.duration.base} linear, border-color ${tokenVars.duration.base} linear`,
});

export const switchThumb = style({
  position: "absolute",
  left: "0.0625em",
  width: "calc(1em - 0.25em)",
  height: "calc(1em - 0.25em)",
  borderRadius: "50%",
  background: `rgb(${themeVars.surface.base})`,
  boxShadow: `0 1px 2px rgba(0, 0, 0, 0.2)`,
  transition: `transform ${tokenVars.duration.base} ease`,
});

export const switchContents = style({
  selectors: {
    "&:empty": {
      display: "none",
    },
  },
});

// 기본 focus 스타일
globalStyle(`${switchStyle.classNames.base}:focus-within .${switchTrack}`, {
  boxShadow: `0 0 0 2px rgb(${themeVars.control.primary.muted})`,
});

// checked 상태에서 thumb 위치 이동
globalStyle(`${switchStyle.classNames.variants.checked.true} .${switchThumb}`, {
  transform: "translateX(calc(1em - 0.125em))",
});

// theme + checked 조합 스타일
for (const [theme, color] of objEntries(themeVars.control)) {
  const checkedClass = switchStyle.classNames.variants.checked.true;
  const themeClass = switchStyle.classNames.variants.theme[theme];

  globalStyle(`${checkedClass}${themeClass} .${switchTrack}`, {
    background: `rgb(${color.base})`,
    borderColor: `rgb(${color.base})`,
  });

  globalStyle(`${checkedClass}${themeClass}:focus-within .${switchTrack}`, {
    boxShadow: `0 0 0 2px rgb(${color.muted})`,
  });
}

export type SwitchStyles = NonNullable<RecipeVariants<typeof switchStyle>>;
