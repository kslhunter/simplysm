import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/variables/vars.css";
const topbarMenu = style({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: vars.spacing.sm
});
const topbarMenuNestedList = style({
  backgroundColor: `rgba(${vars.text.base}, 0.03)`
});
export {
  topbarMenu,
  topbarMenuNestedList
};
//# sourceMappingURL=topbar-menu.css.js.map
