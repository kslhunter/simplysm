import { style } from "@vanilla-extract/css";
import { themeVars } from "../styles/variables/theme.css";

/**
 * invalid directive가 적용된 컨테이너 스타일
 * position: relative로 설정하여 빨간 점 위치의 기준이 됨
 */
export const invalidContainer = style({
  position: "relative",
});

/**
 * 유효성 검증 실패 시 표시되는 빨간 점 스타일
 * ::before pseudo-element로 좌상단에 빨간 점 표시
 */
export const invalidDot = style({
  selectors: {
    "&::before": {
      content: '""',
      position: "absolute",
      top: "2px",
      left: "2px",
      width: "6px",
      height: "6px",
      borderRadius: "50%",
      background: `rgb(${themeVars.control.danger.base})`,
      pointerEvents: "none",
      zIndex: 1,
    },
  },
});

/**
 * 숨겨진 input 스타일 (폼 검증용)
 */
export const hiddenInputStyle = style({
  position: "absolute",
  opacity: 0,
  width: 0,
  height: 0,
  pointerEvents: "none",
  // 폼 제출 시 포커스가 이 요소로 이동하면 부모로 스크롤되도록
  top: 0,
  left: 0,
});
