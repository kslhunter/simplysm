import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/variables/vars.css";
import { tokenVars } from "../../styles/variables/token.css";
const topbar = style({
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
const topbarTitle = style({
  paddingRight: vars.spacing.xl,
  margin: 0,
});
export { topbar, topbarTitle };
//# sourceMappingURL=topbar.css.js.map
