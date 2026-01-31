import { style } from "@vanilla-extract/css";

/**
 * TopbarContainer 스타일
 *
 * flex-column 레이아웃으로 Topbar와 콘텐츠 영역을 수직 배치한다.
 */
export const topbarContainer = style({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
  overflow: "hidden",
});
