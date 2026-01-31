import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/variables/vars.css";
import { tokenVars } from "../../styles/variables/token.css";

/**
 * Topbar 스타일
 *
 * 상단바 본체 스타일. 가로 스크롤 지원, user-select 비활성화.
 */
export const topbar = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: vars.spacing.base,
  minHeight: "3.5rem",
  paddingLeft: vars.spacing.lg,
  paddingRight: vars.spacing.lg,
  backgroundColor: `rgb(${vars.surface.base})`,
  borderBottom: `1px solid rgb(${vars.border.base})`,
  boxShadow: tokenVars.shadow.sm,
  overflowX: "auto",
  overflowY: "hidden",
  userSelect: "none",
  flexShrink: 0,
});

/**
 * Topbar 내부 제목(h1-h6) 스타일
 */
export const topbarTitle = style({
  paddingRight: vars.spacing.xl,
  margin: 0,
});
