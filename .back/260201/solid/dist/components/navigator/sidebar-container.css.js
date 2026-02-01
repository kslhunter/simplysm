import { recipe } from "@vanilla-extract/recipes";
import { tokenVars } from "../../styles/variables/token.css";
import { themeVars } from "../../styles/variables/theme.css";
import { MOBILE_BREAKPOINT } from "./sidebar-constants";
import { vars } from "@simplysm/solid/styles";
const sidebarContainer = recipe({
  base: {
    display: "block",
    position: "relative",
    height: "100%",
    transition: `padding-left ${tokenVars.duration.base} ease-out`,
    "@media": {
      [`(max-width: ${MOBILE_BREAKPOINT})`]: {
        paddingLeft: "0 !important"
      }
    }
  }
});
const sidebarBackdrop = recipe({
  base: {
    position: "absolute",
    display: "none",
    zIndex: 49,
    // sidebar z-index - 1
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: `rgb(${themeVars.surface.inverted})`,
    opacity: 0,
    pointerEvents: "none",
    transition: `opacity ${tokenVars.duration.slow} ease-in-out`,
    "@media": {
      [`(max-width: ${MOBILE_BREAKPOINT})`]: {
        display: "block"
      }
    }
  },
  variants: {
    toggled: {
      true: {
        // 모바일: 토글됨 → 사이드바 표시 → 백드롭 표시
        "@media": {
          [`(max-width: ${MOBILE_BREAKPOINT})`]: {
            opacity: vars.overlay.muted,
            pointerEvents: "auto"
          }
        }
      },
      false: {}
    }
  }
});
export {
  sidebarBackdrop,
  sidebarContainer
};
//# sourceMappingURL=sidebar-container.css.js.map
