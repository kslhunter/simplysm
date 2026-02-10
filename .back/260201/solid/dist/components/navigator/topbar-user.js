import "@simplysm/core-common";
import { createSignal, For, splitProps } from "solid-js";
import { topbarUser } from "./topbar-user.css";
import { Dropdown } from "../overlay/dropdown";
import { DropdownPopup } from "../overlay/dropdown-popup";
import { useDropdown } from "../overlay/dropdown-context";
import { Button } from "../controls/button";
import { List } from "../data/list";
import { ListItem } from "../data/list-item";
const TopbarUser = (props) => {
  const [local, rest] = splitProps(props, ["menus", "children", "class"]);
  const [open, setOpen] = createSignal(false);
  return /* @__PURE__ */ React.createElement(
    "div",
    { ...rest, class: [topbarUser, local.class].filterExists().join(" ") },
    /* @__PURE__ */ React.createElement(
      Dropdown,
      { open: open(), onOpenChange: setOpen },
      /* @__PURE__ */ React.createElement(Button, { link: true }, local.children),
      /* @__PURE__ */ React.createElement(TopbarUserPopup, { menus: local.menus }),
    ),
  );
};
const TopbarUserPopup = (props) => {
  const dropdown = useDropdown();
  return /* @__PURE__ */ React.createElement(
    DropdownPopup,
    null,
    /* @__PURE__ */ React.createElement(
      List,
      null,
      /* @__PURE__ */ React.createElement(For, { each: props.menus }, (menu) =>
        /* @__PURE__ */ React.createElement(
          ListItem,
          {
            onClick: () => {
              menu.onClick();
              dropdown == null ? void 0 : dropdown.close();
            },
          },
          menu.title,
        ),
      ),
    ),
  );
};
export { TopbarUser };
//# sourceMappingURL=topbar-user.js.map
