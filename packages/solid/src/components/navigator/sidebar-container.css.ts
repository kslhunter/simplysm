import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { tokenVars } from "../../styles/variables/token.css";
import { themeVars } from "../../styles/variables/theme.css";
import { MOBILE_BREAKPOINT } from "./sidebar-constants";
import { vars } from "@simplysm/solid/styles";

/**
 * SidebarContainer 최외곽 컨테이너 스타일
 * 전체 레이아웃을 감싸며, 사이드바 열림 상태에 따라 메인 콘텐츠의 여백을 조정한다.
 * - 데스크톱: open=true → padding-left 적용 (inline style), open=false → padding-left: 0
 * - 모바일: padding-left 항상 0 (오버레이 모드)
 *
 * 주의: paddingLeft는 SidebarContainer 컴포넌트에서 inline style로 처리됨
 */
export const sidebarContainer = recipe({
  base: {
    display: "block",
    position: "relative",
    height: "100%",
    transition: `padding-left ${tokenVars.duration.base} ease-out`,
    "@media": {
      [`(max-width: ${MOBILE_BREAKPOINT})`]: {
        paddingLeft: "0 !important",
      },
    },
  },
});

export type SidebarContainerStyles = NonNullable<RecipeVariants<typeof sidebarContainer>>;

/**
 * 모바일에서 사이드바가 토글되었을 때 표시되는 백드롭 오버레이
 * max-width: 520px에서만 표시
 *
 * toggled=true일 때 모바일에서 사이드바가 표시되므로 백드롭도 표시
 */
export const sidebarBackdrop = recipe({
  base: {
    position: "absolute",
    display: "none",
    zIndex: 49, // sidebar z-index - 1
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
        display: "block",
      },
    },
  },
  variants: {
    toggled: {
      true: {
        // 모바일: 토글됨 → 사이드바 표시 → 백드롭 표시
        "@media": {
          [`(max-width: ${MOBILE_BREAKPOINT})`]: {
            opacity: vars.overlay.muted,
            pointerEvents: "auto",
          },
        },
      },
      false: {},
    },
  },
});
