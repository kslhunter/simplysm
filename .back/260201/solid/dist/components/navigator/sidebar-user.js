import "@simplysm/core-common";
import { createSignal, For, Show, splitProps } from "solid-js";
import { sidebarUser, sidebarUserContent, sidebarUserIconCircle } from "./sidebar-user.css";
import { Collapse } from "./collapse";
import { List } from "../data/list";
import { ListItem } from "../data/list-item";
import { ripple } from "../../directives/ripple";
import { atoms } from "../../styles/atoms.css";
import { IconUser } from "@tabler/icons-solidjs";
void ripple;
const SidebarUser = (props) => {
  const [local, rest] = splitProps(props, ["menus", "name", "description"]);
  const [menuOpen, setMenuOpen] = createSignal(false);
  return /* @__PURE__ */ React.createElement(
    "div",
    { ...rest, class: [sidebarUser, rest.class].filterExists().join(" ") },
    /* @__PURE__ */ React.createElement(
      "div",
      { "class": sidebarUserContent, "onClick": () => setMenuOpen((v) => !v), "use:ripple": true },
      /* @__PURE__ */ React.createElement(
        "div",
        { class: sidebarUserIconCircle },
        /* @__PURE__ */ React.createElement(IconUser, { size: 20 }),
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        null,
        /* @__PURE__ */ React.createElement(
          "div",
          { class: atoms({ fontWeight: "bold" }) },
          local.name,
        ),
        /* @__PURE__ */ React.createElement(
          Show,
          { when: local.description },
          /* @__PURE__ */ React.createElement(
            "div",
            { class: atoms({ fontSize: "sm", color: "muted" }) },
            local.description,
          ),
        ),
      ),
    ),
    /* @__PURE__ */ React.createElement(
      Collapse,
      { open: menuOpen() },
      /* @__PURE__ */ React.createElement(
        List,
        { inset: true },
        /* @__PURE__ */ React.createElement(For, { each: local.menus }, (menuItem) =>
          /* @__PURE__ */ React.createElement(
            ListItem,
            { onClick: menuItem.onClick },
            menuItem.title,
          ),
        ),
      ),
    ),
  );
};
export { SidebarUser };
//# sourceMappingURL=sidebar-user.js.map
