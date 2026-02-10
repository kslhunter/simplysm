import { globalStyle, style } from "@vanilla-extract/css";
import { themeVars, tokenVars } from "@simplysm/solid/styles";

export const demoTable = style({
  borderCollapse: "collapse",
});

globalStyle(`${demoTable} td, ${demoTable} th`, {
  border: `1px solid rgb(${themeVars.border.base})`,
  padding: "0",
});

/**
 * 데모 섹션 컨테이너
 * 고정 높이로 미니 레이아웃을 표시한다.
 */
export const layoutDemoContainer = style({
  height: "350px",
  border: `1px solid rgb(${themeVars.border.base})`,
  borderRadius: tokenVars.radius.base,
  overflow: "hidden",
  position: "relative",
});

/**
 * 미니 레이아웃의 메인 콘텐츠 영역
 */
export const layoutDemoContent = style({
  padding: tokenVars.spacing.lg,
  height: "100%",
  overflow: "auto",
});

/**
 * 모바일 데모를 위한 iframe 컨테이너
 */
export const layoutMobileIframeContainer = style({
  width: "375px",
  height: "500px",
  border: `1px solid rgb(${themeVars.border.base})`,
  borderRadius: tokenVars.radius.base,
  overflow: "hidden",
});

/**
 * 데모 그리드 레이아웃 (2열)
 */
export const layoutDemoGrid = style({
  "display": "grid",
  "gridTemplateColumns": "repeat(2, 1fr)",
  "gap": tokenVars.spacing.xl,
  "@media": {
    "(max-width: 900px)": {
      gridTemplateColumns: "1fr",
    },
  },
});
