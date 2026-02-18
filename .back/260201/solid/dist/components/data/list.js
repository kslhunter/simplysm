import { splitProps } from "solid-js";
import { list } from "./list.css";
import { objPick } from "@simplysm/core-common";
const List = (props) => {
  const [local, rest] = splitProps(props, [...list.variants(), "class", "children"]);
  let listRef;
  const isVisible = (el) => {
    let parent = el.parentElement;
    while (parent && parent !== listRef) {
      if (parent.hasAttribute("data-collapsed")) {
        return false;
      }
      parent = parent.parentElement;
    }
    return true;
  };
  const handleArrowRight = (current) => {
    var _a;
    const isOpen = current.getAttribute("aria-expanded") === "true";
    const hasChildren = current.hasAttribute("aria-expanded");
    if (!hasChildren) return;
    if (!isOpen) {
      current.click();
    } else {
      const nestedItem =
        (_a = current.parentElement) == null
          ? void 0
          : _a.querySelector(
              ":scope > [data-collapsed] [data-list-item], :scope > * > [data-list-item]",
            );
      nestedItem == null ? void 0 : nestedItem.focus();
    }
  };
  const handleArrowLeft = (current) => {
    var _a, _b;
    const isOpen = current.getAttribute("aria-expanded") === "true";
    const hasChildren = current.hasAttribute("aria-expanded");
    if (hasChildren && isOpen) {
      current.click();
    } else {
      const parentItem =
        (_b = (_a = current.parentElement) == null ? void 0 : _a.parentElement) == null
          ? void 0
          : _b.closest("[data-list-item]");
      parentItem == null ? void 0 : parentItem.focus();
    }
  };
  const handleKeyDown = (e) => {
    var _a, _b, _c, _d;
    const current = e.target;
    if (!current.hasAttribute("data-list-item")) return;
    const allItems = [...listRef.querySelectorAll('[data-list-item]:not([aria-disabled="true"])')];
    const visibleItems = allItems.filter((el) => isVisible(el));
    const idx = visibleItems.indexOf(current);
    switch (e.key) {
      case " ":
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        current.click();
        break;
      case "ArrowDown":
        if (idx + 1 < visibleItems.length) {
          e.preventDefault();
          e.stopPropagation();
          (_a = visibleItems[idx + 1]) == null ? void 0 : _a.focus();
        }
        break;
      case "ArrowUp":
        if (idx - 1 >= 0) {
          e.preventDefault();
          e.stopPropagation();
          (_b = visibleItems[idx - 1]) == null ? void 0 : _b.focus();
        }
        break;
      case "Home":
        if (visibleItems.length > 0 && idx !== 0) {
          e.preventDefault();
          e.stopPropagation();
          (_c = visibleItems[0]) == null ? void 0 : _c.focus();
        }
        break;
      case "End":
        if (visibleItems.length > 0 && idx !== visibleItems.length - 1) {
          e.preventDefault();
          e.stopPropagation();
          (_d = visibleItems[visibleItems.length - 1]) == null ? void 0 : _d.focus();
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        e.stopPropagation();
        handleArrowRight(current);
        break;
      case "ArrowLeft":
        e.preventDefault();
        e.stopPropagation();
        handleArrowLeft(current);
        break;
    }
  };
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      ref: listRef,
      role: "tree",
      onKeyDown: handleKeyDown,
      ...rest,
      class: [list(objPick(local, list.variants())), local.class].filterExists().join(" "),
    },
    local.children,
  );
};
export { List };
//# sourceMappingURL=list.js.map
