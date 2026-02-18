import { children, createMemo, createSignal, Show, splitProps } from "solid-js";
import { IconChevronLeft } from "@tabler/icons-solidjs";
import { Collapse } from "../navigator/collapse";
import { CollapseIcon } from "../navigator/collapse-icon";
import { listItem, listItemContent } from "./list-item.css";
import { list } from "./list.css";
import { ripple } from "../../directives/ripple";
import { objPick } from "@simplysm/core-common";
import { themeVars } from "../../styles/variables/theme.css";
import { tokenVars } from "../../styles/variables/token.css";
import { combineStyle } from "@solid-primitives/props";
import { atoms } from "../../styles/atoms.css";
void ripple;
const ListItem = (props) => {
  var _a, _b;
  const [local, styleProps, rest] = splitProps(
    props,
    [...listItemContent.variants(), "open", "onOpenChange", "selectedIcon", "icon", "children"],
    ["class", "style"],
  );
  const [internalOpen, setInternalOpen] = createSignal(local.open ?? false);
  const isControlled = () => local.onOpenChange !== void 0;
  const open = () => (isControlled() ? (local.open ?? false) : internalOpen());
  const setOpen = (value) => {
    var _a2;
    if (isControlled()) {
      (_a2 = local.onOpenChange) == null ? void 0 : _a2.call(local, value);
    } else {
      setInternalOpen(value);
    }
  };
  const resolved = children(() => local.children);
  const parsed = createMemo(() => {
    const arr = resolved.toArray();
    let nestedList2;
    const content2 = [];
    for (const c of arr) {
      if (c instanceof HTMLElement && c.classList.contains(list.classNames.base)) {
        nestedList2 = c;
      } else {
        content2.push(c);
      }
    }
    return { content: content2, nestedList: nestedList2, hasChildren: nestedList2 !== void 0 };
  });
  const content = () => parsed().content;
  const nestedList = () => parsed().nestedList;
  const hasChildren = () => parsed().hasChildren;
  const useRipple = () => !local.disabled && !(local.layout === "flat" && hasChildren());
  const selectedIconStyle = createMemo(() => ({
    color: local.selected
      ? `rgb(${themeVars.control.primary.base})`
      : `rgba(${themeVars.text.base}, ${tokenVars.overlay.base})`,
  }));
  const onContentClick = () => {
    if (local.disabled) return;
    setOpen(!open());
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    { class: listItem, ...rest },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        "use:ripple": useRipple(),
        "class": listItemContent({
          ...objPick(local, listItemContent.variants()),
          hasChildren: hasChildren(),
          hasSelectedIcon: !!local.selectedIcon,
        }),
        "data-list-item": true,
        "role": "treeitem",
        "aria-expanded": hasChildren() ? open() : void 0,
        "aria-disabled": local.disabled || void 0,
        "tabIndex": 0,
        "onClick": onContentClick,
        "onFocus": (e) => {
          const treeRoot = e.currentTarget.closest("[role='tree']");
          treeRoot == null
            ? void 0
            : treeRoot.querySelectorAll("[data-list-item]").forEach((el) => {
                el.tabIndex = -1;
              });
          e.currentTarget.tabIndex = 0;
        },
      },
      /* @__PURE__ */ React.createElement(
        Show,
        { when: local.selectedIcon && !hasChildren() },
        (_a = local.selectedIcon) == null ? void 0 : _a.call(local, { style: selectedIconStyle() }),
      ),
      /* @__PURE__ */ React.createElement(
        Show,
        { when: local.icon },
        (_b = local.icon) == null ? void 0 : _b.call(local, {}),
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          class: [atoms({ display: "flex", alignItems: "center" }), styleProps.class]
            .filterExists()
            .join(" "),
          style: combineStyle(styleProps.style, { flex: 1 }),
        },
        content(),
      ),
      /* @__PURE__ */ React.createElement(
        Show,
        { when: hasChildren() && local.layout !== "flat" },
        /* @__PURE__ */ React.createElement(CollapseIcon, {
          icon: IconChevronLeft,
          open: open(),
          openRotate: -90,
        }),
      ),
    ),
    /* @__PURE__ */ React.createElement(
      Show,
      { when: hasChildren() },
      /* @__PURE__ */ React.createElement(
        Collapse,
        {
          open: local.layout === "flat" || open(),
          class: atoms({ py: "xs" }),
        },
        nestedList(),
      ),
    ),
  );
};
export { ListItem };
//# sourceMappingURL=list-item.js.map
