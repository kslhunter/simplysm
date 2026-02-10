import { globalStyle, style } from "@vanilla-extract/css";
import { list } from "../data/list.css";
import { vars } from "../../styles/variables/vars.css";
import { themeVars } from "../../styles/variables/theme.css";
const sidebarUser = style({
  display: "block",
  margin: `${vars.spacing.sm} ${vars.spacing.base}`,
  borderRadius: vars.radius.base,
  overflow: "hidden",
  background: `rgb(${vars.surface.elevated})`,
});
const sidebarUserContent = style({
  display: "flex",
  alignItems: "center",
  gap: vars.spacing.lg,
  padding: vars.spacing.lg,
  cursor: "pointer",
  userSelect: "none",
});
const sidebarUserIconCircle = style({
  width: "2.5rem",
  height: "2.5rem",
  borderRadius: "100%",
  background: `rgb(${themeVars.control.primary.base})`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "white",
  fontWeight: "bold",
});
globalStyle(`${sidebarUser} ${list.classNames.base}`, {
  borderTop: `1px solid rgb(${vars.border.muted})`,
  padding: `1px 0`,
});
export { sidebarUser, sidebarUserContent, sidebarUserIconCircle };
//# sourceMappingURL=sidebar-user.css.js.map
