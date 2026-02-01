import { tokenVars } from "../../styles/variables/token.css";
import { themeVars } from "../../styles/variables/theme.css";
import { recipe } from "@vanilla-extract/recipes";
import { objEntries, objFromEntries } from "@simplysm/core-common";
const button = recipe({
  base: {
    display: "inline-flex",
    userSelect: "none",
    fontWeight: "bold",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokenVars.radius.base,
    cursor: "pointer",
    padding: `${tokenVars.spacing.sm} ${tokenVars.spacing.lg}`,
    background: `rgb(${themeVars.surface.base})`,
    border: `1px solid transparent`,
    borderColor: `rgb(${themeVars.border.base})`,
    transition: `${tokenVars.duration.base} linear`,
    transitionProperty: "border-color, background",
    selectors: {
      "&:hover, &:focus-visible": {
        background: `rgb(${themeVars.surface.elevated})`
      },
      "&:disabled": {
        pointerEvents: "none",
        opacity: tokenVars.overlay.muted
      }
    }
  },
  variants: {
    theme: objFromEntries(
      objEntries(themeVars.control).map(([theme, color]) => [
        theme,
        {
          background: `rgb(${color.base})`,
          borderColor: "transparent",
          color: `rgb(${themeVars.text.inverted})`,
          selectors: {
            "&:hover, &:focus-visible": {
              background: `rgb(${color.hover})`
            }
          }
        }
      ])
    ),
    link: {
      true: {
        background: "transparent",
        borderColor: "transparent"
      }
    },
    inset: {
      true: {
        border: "none",
        borderRadius: 0
      }
    },
    size: {
      xs: {
        padding: `${tokenVars.spacing.xxs} ${tokenVars.spacing.sm}`,
        fontSize: `${tokenVars.font.size.sm}`
      },
      sm: {
        padding: `${tokenVars.spacing.xs} ${tokenVars.spacing.base}`
      },
      base: {},
      lg: {
        padding: `${tokenVars.spacing.base} ${tokenVars.spacing.xl}`
      },
      xl: {
        padding: `${tokenVars.spacing.lg} ${tokenVars.spacing.xxl}`,
        fontSize: `${tokenVars.font.size.lg}`
      }
    }
  },
  compoundVariants: [
    ...objEntries(themeVars.control).map(([theme, color]) => ({
      variants: {
        theme,
        link: true
      },
      style: {
        background: "transparent",
        borderColor: `transparent`,
        color: `rgb(${color.base})`,
        selectors: {
          "&:hover, &:focus-visible": {
            background: `rgb(${color.muted})`
          }
        }
      }
    }))
  ],
  // 기본 스타일은 base에 정의되어 있음
  // theme: undefined → 기본 회색 테두리 버튼
  // size: undefined → base의 기본 padding (spacing.sm spacing.lg 토큰)
  defaultVariants: {}
});
export {
  button
};
//# sourceMappingURL=button.css.js.map
