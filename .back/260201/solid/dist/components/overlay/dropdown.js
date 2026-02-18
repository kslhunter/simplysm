import "@simplysm/core-common";
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  splitProps,
} from "solid-js";
import { tabbable } from "tabbable";
import { DropdownContext, useDropdownInternal } from "./dropdown-context";
import { dropdown } from "./dropdown.css";
import { MOBILE_BREAKPOINT_PX } from "../../constants.js";
const getScrollableParents = (element) => {
  const scrollableParents = [];
  let current = element.parentElement;
  while (current) {
    const style = getComputedStyle(current);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    if (
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowX === "auto" ||
      overflowX === "scroll"
    ) {
      scrollableParents.push(current);
    }
    current = current.parentElement;
  }
  return scrollableParents;
};
const Dropdown = (props) => {
  const [local, rest] = splitProps(props, [
    "open",
    "onOpenChange",
    "disabled",
    "children",
    "class",
  ]);
  const id = createUniqueId();
  const parentCtx = useDropdownInternal();
  const [childIds, setChildIds] = createSignal(/* @__PURE__ */ new Set());
  const [internalOpen, setInternalOpen] = createSignal(local.open ?? false);
  const isControlled = () => local.onOpenChange !== void 0;
  const isOpen = createMemo(() => (isControlled() ? (local.open ?? false) : internalOpen()));
  const setOpen = (value) => {
    var _a;
    if (local.disabled) return;
    if (isControlled()) {
      (_a = local.onOpenChange) == null ? void 0 : _a.call(local, value);
    } else {
      setInternalOpen(value);
    }
  };
  const openPopup = () => setOpen(true);
  const closePopup = () => setOpen(false);
  const togglePopup = () => setOpen(!isOpen());
  const [placement, setPlacement] = createSignal("bottom");
  const [isMobile, setIsMobile] = createSignal(false);
  const [popupStyle, setPopupStyle] = createSignal({});
  let triggerRef;
  const [hasFocusable, setHasFocusable] = createSignal(true);
  const updatePlacement = () => {
    const checkMobile = window.innerWidth <= MOBILE_BREAKPOINT_PX;
    setIsMobile(checkMobile);
    if (!checkMobile) {
      const rect = triggerRef.getBoundingClientRect();
      const isPlaceTop = rect.top > window.innerHeight / 2;
      setPlacement(isPlaceTop ? "top" : "bottom");
    }
  };
  const updatePosition = () => {
    const checkMobile = window.innerWidth <= MOBILE_BREAKPOINT_PX;
    if (checkMobile) {
      setPopupStyle({});
      return;
    }
    const rect = triggerRef.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const isPlaceRight = rect.left > viewportWidth / 2;
    const style = {
      "min-width": `${rect.width}px`,
    };
    if (placement() === "top") {
      style.bottom = `${viewportHeight - rect.top + 2}px`;
    } else {
      style.top = `${rect.bottom + 2}px`;
    }
    if (isPlaceRight) {
      style.right = `${viewportWidth - rect.right}px`;
    } else {
      style.left = `${rect.left}px`;
    }
    setPopupStyle(style);
  };
  createEffect(() => {
    if (isOpen()) {
      parentCtx == null ? void 0 : parentCtx.registerChild(id);
      updatePlacement();
      requestAnimationFrame(() => {
        updatePosition();
      });
      const handleScroll = () => {
        updatePlacement();
        updatePosition();
      };
      const handleResize = () => {
        updatePlacement();
        updatePosition();
      };
      const handleClickOutside = (e) => {
        const target = e.target;
        if (triggerRef.contains(target)) return;
        const popupEl = document.querySelector(`[data-dropdown-id="${id}"]`);
        if (popupEl == null ? void 0 : popupEl.contains(target)) return;
        for (const childId of childIds()) {
          const childPopup = document.querySelector(`[data-dropdown-id="${childId}"]`);
          if (childPopup == null ? void 0 : childPopup.contains(target)) return;
        }
        closePopup();
      };
      const scrollableParents = getScrollableParents(triggerRef);
      document.addEventListener("scroll", handleScroll, { capture: true, passive: true });
      for (const parent of scrollableParents) {
        parent.addEventListener("scroll", handleScroll, { passive: true });
      }
      window.addEventListener("resize", handleResize, { passive: true });
      document.addEventListener("mousedown", handleClickOutside);
      onCleanup(() => {
        document.removeEventListener("scroll", handleScroll, { capture: true });
        for (const parent of scrollableParents) {
          parent.removeEventListener("scroll", handleScroll);
        }
        window.removeEventListener("resize", handleResize);
        document.removeEventListener("mousedown", handleClickOutside);
        parentCtx == null ? void 0 : parentCtx.unregisterChild(id);
      });
    }
  });
  let mouseoverEl;
  const handleMouseOver = (e) => {
    mouseoverEl = e.target;
  };
  const handleBlurCapture = (e) => {
    var _a;
    if (!isOpen()) return;
    const relatedTarget = e.relatedTarget;
    if (triggerRef.contains(relatedTarget)) {
      return;
    }
    const popupEl = document.querySelector(`[data-dropdown-id="${id}"]`);
    if (popupEl == null ? void 0 : popupEl.contains(relatedTarget)) {
      return;
    }
    for (const childId of childIds()) {
      const childPopup = document.querySelector(`[data-dropdown-id="${childId}"]`);
      if (childPopup == null ? void 0 : childPopup.contains(relatedTarget)) {
        return;
      }
    }
    if (relatedTarget == null && mouseoverEl) {
      if (
        triggerRef.contains(mouseoverEl) ||
        (popupEl == null ? void 0 : popupEl.contains(mouseoverEl))
      ) {
        const focusable = popupEl ? tabbable(popupEl)[0] : void 0;
        (_a = focusable ?? popupEl) == null ? void 0 : _a.focus();
        return;
      }
    }
    closePopup();
  };
  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.altKey) return;
    const isOpenKey =
      (e.key === "ArrowDown" && placement() === "bottom") ||
      (e.key === "ArrowUp" && placement() === "top");
    const isCloseKey =
      (e.key === "ArrowUp" && placement() === "bottom") ||
      (e.key === "ArrowDown" && placement() === "top");
    if (isOpenKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!isOpen()) {
        openPopup();
      } else {
        const popupEl = document.querySelector(`[data-dropdown-id="${id}"]`);
        const tabbables = popupEl ? tabbable(popupEl) : [];
        const targetFocusable = placement() === "top" ? tabbables.at(-1) : tabbables[0];
        targetFocusable == null ? void 0 : targetFocusable.focus();
      }
      return;
    }
    if (isCloseKey && isOpen()) {
      e.preventDefault();
      e.stopPropagation();
      closePopup();
      return;
    }
    switch (e.key) {
      case " ":
        e.preventDefault();
        e.stopPropagation();
        togglePopup();
        break;
      case "Escape":
        if (isOpen()) {
          e.preventDefault();
          e.stopPropagation();
          closePopup();
          triggerRef.focus();
        }
        break;
    }
  };
  const contextValue = {
    id,
    parentId: parentCtx == null ? void 0 : parentCtx.id,
    open: isOpen,
    close: closePopup,
    registerChild: (childId) => {
      setChildIds((prev) => new Set(prev).add(childId));
    },
    unregisterChild: (childId) => {
      setChildIds((prev) => {
        const next = new Set(prev);
        next.delete(childId);
        return next;
      });
    },
    isDescendant: (targetId) => childIds().has(targetId),
    placement,
    isMobile,
    popupStyle,
    focusTrigger: () => {
      const focusable = tabbable(triggerRef)[0];
      if (focusable != null) {
        focusable.focus();
      } else {
        triggerRef.focus();
      }
    },
  };
  return /* @__PURE__ */ React.createElement(
    DropdownContext.Provider,
    { value: contextValue },
    /* @__PURE__ */ React.createElement(
      "div",
      {
        "ref": (el) => {
          triggerRef = el;
          el.addEventListener("blur", handleBlurCapture, true);
          onCleanup(() => el.removeEventListener("blur", handleBlurCapture, true));
          requestAnimationFrame(() => {
            setHasFocusable(tabbable(el).length > 0);
          });
        },
        "tabIndex": local.disabled ? -1 : hasFocusable() ? -1 : 0,
        "role": "button",
        "aria-haspopup": "menu",
        "aria-expanded": isOpen(),
        "aria-controls": isOpen() ? `dropdown-popup-${id}` : void 0,
        "aria-disabled": local.disabled || void 0,
        "class": [dropdown, local.class].filterExists().join(" "),
        "data-disabled": local.disabled,
        "onClick": (e) => {
          e.stopPropagation();
          togglePopup();
        },
        "onKeyDown": handleKeyDown,
        "onMouseOver": handleMouseOver,
        ...rest,
      },
      local.children,
    ),
  );
};
export { Dropdown };
//# sourceMappingURL=dropdown.js.map
