import { style } from "@vanilla-extract/css";
import { tokenVars } from "../../styles/variables/token.css";
import { themeVars } from "../../styles/variables/theme.css";

export const sidebarMenu = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "auto"
});

export const sidebarMenuHeader = style({
  padding: `${tokenVars.spacing.xl} ${tokenVars.spacing.lg}`,
  paddingBottom: tokenVars.spacing.base,
  fontWeight: "bold",
  fontSize: tokenVars.font.size.sm,
  textTransform: "uppercase",
  color: `rgb(${themeVars.text.muted})`,
  letterSpacing: "0.08rem",
});

export const sidebarMenuList = style({
  flex: 1,
  overflow: "auto"
});
