import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/variables/vars.css";

/**
 * TopbarMenu 컨테이너 스타일
 */
export const topbarMenu = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: vars.spacing.sm,
});

/**
 * 중첩 리스트 배경 스타일 (드롭다운 내)
 */
export const topbarMenuNestedList = style({
  backgroundColor: `rgba(${vars.text.base}, 0.03)`,
});
