import { style } from "@vanilla-extract/css";
import { tokenVars } from "../../styles/variables/token.css";
import { themeVars } from "../../styles/variables/theme.css";
const sidebarMenu = style({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  overflow: "auto"
});
const sidebarMenuHeader = style({
  padding: `${tokenVars.spacing.xl} ${tokenVars.spacing.lg}`,
  paddingBottom: tokenVars.spacing.base,
  fontWeight: "bold",
  fontSize: tokenVars.font.size.sm,
  textTransform: "uppercase",
  color: `rgb(${themeVars.text.muted})`,
  letterSpacing: "0.08rem"
});
const sidebarMenuList = style({
  flex: 1,
  overflow: "auto"
});
export {
  sidebarMenu,
  sidebarMenuHeader,
  sidebarMenuList
};
//# sourceMappingURL=sidebar-menu.css.js.map
