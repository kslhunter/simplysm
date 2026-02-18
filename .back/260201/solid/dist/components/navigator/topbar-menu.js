import "@simplysm/core-common";
import { createSignal, For, Show, splitProps } from "solid-js";
import { IconChevronDown } from "@tabler/icons-solidjs";
import { useLocation, useNavigate } from "@solidjs/router";
import { topbarMenu, topbarMenuNestedList } from "./topbar-menu.css";
import { Dropdown } from "../overlay/dropdown";
import { DropdownPopup } from "../overlay/dropdown-popup";
import { useDropdown } from "../overlay/dropdown-context";
import { Button } from "../controls/button";
import { List } from "../data/list";
import { ListItem } from "../data/list-item";
import { atoms } from "../../styles/atoms.css";
import { buildHref } from "../../utils/build-href";
const TopbarMenu = (props) => {
  const [local, rest] = splitProps(props, ["menus", "isSelectedFn", "class"]);
  const location = useLocation();
  const navigate = useNavigate();
  const isSelected = (menu) => {
    if (local.isSelectedFn) return local.isSelectedFn(menu);
    return menu.path != null && location.pathname === menu.path;
  };
  const handleMenuClick = (menu, event, closeDropdown) => {
    if (menu.url != null) {
      window.open(menu.url, "_blank");
      closeDropdown();
      return;
    }
    if (menu.path != null) {
      if (event.ctrlKey || event.altKey) {
        window.open(buildHref(menu.path), "_blank");
      } else if (event.shiftKey) {
        window.open(buildHref(menu.path), "_blank", "width=800,height=800");
      } else {
        navigate(menu.path);
      }
      closeDropdown();
    }
  };
  return /* @__PURE__ */ React.createElement(
    "nav",
    { ...rest, class: [topbarMenu, local.class].filterExists().join(" ") },
    /* @__PURE__ */ React.createElement(For, { each: local.menus }, (menu) =>
      /* @__PURE__ */ React.createElement(TopbarMenuDropdown, {
        menu,
        isSelected,
        onMenuClick: handleMenuClick,
      }),
    ),
  );
};
const TopbarMenuDropdown = (props) => {
  const [open, setOpen] = createSignal(false);
  return /* @__PURE__ */ React.createElement(
    Dropdown,
    { open: open(), onOpenChange: setOpen },
    /* @__PURE__ */ React.createElement(TopbarMenuTrigger, { menu: props.menu }),
    /* @__PURE__ */ React.createElement(TopbarMenuPopup, {
      menus: props.menu.children ?? [],
      isSelected: props.isSelected,
      onMenuClick: props.onMenuClick,
    }),
  );
};
const TopbarMenuTrigger = (props) => {
  return /* @__PURE__ */ React.createElement(
    Button,
    { link: true },
    /* @__PURE__ */ React.createElement(Show, { when: props.menu.icon }, (icon) =>
      icon()({ size: 18 }),
    ),
    props.menu.title,
    /* @__PURE__ */ React.createElement(IconChevronDown, { size: 16 }),
  );
};
const TopbarMenuPopup = (props) => {
  const dropdown = useDropdown();
  return /* @__PURE__ */ React.createElement(
    DropdownPopup,
    null,
    /* @__PURE__ */ React.createElement(
      List,
      { inset: true },
      /* @__PURE__ */ React.createElement(MenuItemRenderer, {
        menus: props.menus,
        depth: 0,
        isSelected: props.isSelected,
        onMenuClick: props.onMenuClick,
        closeDropdown: () => (dropdown == null ? void 0 : dropdown.close()),
      }),
    ),
  );
};
const MenuItemRenderer = (props) => {
  return /* @__PURE__ */ React.createElement(For, { each: props.menus }, (menu) => {
    var _a;
    return /* @__PURE__ */ React.createElement(
      ListItem,
      {
        layout: "flat",
        selected: props.isSelected(menu),
        style: { "text-indent": `${props.depth > 0 ? (props.depth + 1) * 0.5 : 0}rem` },
        class: atoms({ gap: "xs" }),
        onClick: (e) => props.onMenuClick(menu, e, props.closeDropdown),
      },
      /* @__PURE__ */ React.createElement(Show, { when: menu.icon }, (icon) =>
        icon()({ size: 16 }),
      ),
      /* @__PURE__ */ React.createElement("span", null, menu.title),
      /* @__PURE__ */ React.createElement(
        Show,
        { when: (_a = menu.children) == null ? void 0 : _a.length },
        /* @__PURE__ */ React.createElement(
          List,
          { inset: true, class: topbarMenuNestedList },
          /* @__PURE__ */ React.createElement(MenuItemRenderer, {
            menus: menu.children,
            depth: props.depth + 1,
            isSelected: props.isSelected,
            onMenuClick: props.onMenuClick,
            closeDropdown: props.closeDropdown,
          }),
        ),
      ),
    );
  });
};
export { TopbarMenu };
//# sourceMappingURL=topbar-menu.js.map
