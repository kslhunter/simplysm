import { recipe, type RecipeVariants } from "@vanilla-extract/recipes";
import { tokenVars } from "../../../styles/variables/token.css";
import { themeVars } from "../../../styles/variables/theme.css";
import { MOBILE_BREAKPOINT } from "./sidebar-constants";

/**
 * Sidebar 패널 스타일
 *
 * toggled 변수는 "토글 버튼을 눌렀는가"를 의미하며,
 * 데스크톱과 모바일에서 반대로 동작한다:
 * - 데스크톱: toggled=false → 표시(기본), toggled=true → 숨김
 * - 모바일: toggled=false → 숨김(기본), toggled=true → 표시(오버레이)
 *
 * 주의: width는 Sidebar 컴포넌트에서 inline style로 처리됨 (Context에서 가져옴)
 */
export const sidebar = recipe({
  base: {
    position: "absolute",
    zIndex: 50,
    top: 0,
    left: 0,
    height: "100%",
    backgroundColor: `rgb(${themeVars.surface.base})`,
    borderRight: `1px solid rgb(${themeVars.border.base})`,
    boxShadow: tokenVars.shadow.sm,
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    overflowX: "hidden",
  },
  variants: {
    toggled: {
      false: {
        // 기본 상태
        "@media": {
          // 데스크톱: 표시
          [`not all and (max-width: ${MOBILE_BREAKPOINT})`]: {
            transition: `transform ${tokenVars.duration.base} ease-out`,
          },
          // 모바일: 숨김
          [`(max-width: ${MOBILE_BREAKPOINT})`]: {
            transform: "translateX(-100%)",
            transition: `transform ${tokenVars.duration.slow} ease-in`,
          },
        },
      },
      true: {
        // 토글된 상태
        "@media": {
          // 데스크톱: 숨김
          [`not all and (max-width: ${MOBILE_BREAKPOINT})`]: {
            transform: "translateX(-100%)",
            transition: `transform ${tokenVars.duration.base} ease-in`,
          },
          // 모바일: 표시 + 그림자
          [`(max-width: ${MOBILE_BREAKPOINT})`]: {
            transform: "none",
            transition: `transform ${tokenVars.duration.slow} ease-out`,
            boxShadow: tokenVars.shadow.xl,
          },
        },
      },
    },
  },
  defaultVariants: {
    toggled: false,
  },
});

export type SidebarStyles = NonNullable<RecipeVariants<typeof sidebar>>;
