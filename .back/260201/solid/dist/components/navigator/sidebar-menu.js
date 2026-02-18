import "@simplysm/core-common";
import { createMemo, For, Show, splitProps } from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";
import { sidebarMenu, sidebarMenuHeader, sidebarMenuList } from "./sidebar-menu.css";
import { List } from "../data/list";
import { ListItem } from "../data/list-item";
import { useSidebar } from "./sidebar-context";
import { MOBILE_BREAKPOINT_PX } from "../../constants";
import { atoms } from "../../styles/atoms.css";
import { buildHref } from "../../utils/build-href";
const SidebarMenu = (props) => {
  const [local, rest] = splitProps(props, ["menus", "layout"]);
  const effectiveLayout = createMemo(() => {
    if (local.layout !== void 0) return local.layout;
    return local.menus.length <= 3 ? "flat" : "accordion";
  });
  const { setToggled } = useSidebar();
  const navigate = useNavigate();
  const handleMenuClick = (menu, event) => {
    if (menu.path == null) return;
    if (menu.path.includes("://")) {
      window.open(menu.path, "_blank");
      return;
    }
    if (event.ctrlKey || event.altKey) {
      window.open(buildHref(menu.path), "_blank");
      return;
    }
    if (event.shiftKey) {
      window.open(buildHref(menu.path), "_blank", "width=800,height=800");
      return;
    }
    navigate(menu.path);
    if (window.innerWidth <= MOBILE_BREAKPOINT_PX) {
      setToggled(false);
    }
  };
  return /* @__PURE__ */ React.createElement(
    "nav",
    { ...rest, class: [sidebarMenu, rest.class].filterExists().join(" ") },
    /* @__PURE__ */ React.createElement("div", { class: sidebarMenuHeader }, "MENU"),
    /* @__PURE__ */ React.createElement(
      List,
      { inset: true, class: sidebarMenuList },
      /* @__PURE__ */ React.createElement(For, { each: local.menus }, (menu) =>
        /* @__PURE__ */ React.createElement(MenuItemRenderer, {
          menu,
          depth: 0,
          layout: effectiveLayout(),
          onMenuClick: handleMenuClick,
        }),
      ),
    ),
  );
};
const MenuItemRenderer = (props) => {
  const location = useLocation();
  const hasChildren = () => {
    var _a;
    return (((_a = props.menu.children) == null ? void 0 : _a.length) ?? 0) > 0;
  };
  return /* @__PURE__ */ React.createElement(
    ListItem,
    {
      layout: props.layout,
      selected: location.pathname === props.menu.path,
      style: {
        "text-indent": `${props.parentLayout === "accordion" && props.depth !== 0 ? (props.depth + 1) * 0.5 : 0}rem`,
      },
      class: atoms({ gap: "xs" }),
      onClick: (event) => props.onMenuClick(props.menu, event),
    },
    /* @__PURE__ */ React.createElement(Show, { when: props.menu.icon, keyed: true }, (icon) =>
      icon({}),
    ),
    /* @__PURE__ */ React.createElement("div", null, props.menu.title),
    /* @__PURE__ */ React.createElement(
      Show,
      { when: hasChildren() },
      /* @__PURE__ */ React.createElement(
        List,
        { inset: true },
        /* @__PURE__ */ React.createElement(For, { each: props.menu.children }, (child) =>
          /* @__PURE__ */ React.createElement(MenuItemRenderer, {
            menu: child,
            depth: props.depth + 1,
            layout: "accordion",
            parentLayout: props.layout,
            onMenuClick: props.onMenuClick,
          }),
        ),
      ),
    ),
  );
};
export { SidebarMenu };
//# sourceMappingURL=sidebar-menu.js.map
