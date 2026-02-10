import { Show, splitProps, useContext } from "solid-js";
import { IconMenu2 } from "@tabler/icons-solidjs";
import { topbar } from "./topbar.css";
import { Button } from "../controls/button";
import { SidebarContext } from "./sidebar-context";
import "@simplysm/core-common";
const Topbar = (props) => {
  const [local, rest] = splitProps(props, ["class", "children", "showToggle"]);
  const sidebarCtx = useContext(SidebarContext);
  const showToggle = () => local.showToggle ?? !!sidebarCtx;
  const handleToggleClick = () => {
    sidebarCtx == null ? void 0 : sidebarCtx.toggle();
  };
  return /* @__PURE__ */ React.createElement(
    "header",
    { ...rest, class: [topbar, local.class].filterExists().join(" ") },
    /* @__PURE__ */ React.createElement(
      Show,
      { when: showToggle() },
      /* @__PURE__ */ React.createElement(
        Button,
        { link: true, size: "sm", onClick: handleToggleClick },
        /* @__PURE__ */ React.createElement(IconMenu2, { size: 20 }),
      ),
    ),
    local.children,
  );
};
export { Topbar };
//# sourceMappingURL=topbar.js.map
