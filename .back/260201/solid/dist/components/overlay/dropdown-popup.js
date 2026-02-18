import "@simplysm/core-common";
import { Show, splitProps, createMemo, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { tabbable } from "tabbable";
import { backdrop, dropdownPopup, dropdownPopupContent, mobileHandle } from "./dropdown-popup.css";
import { useDropdownInternal } from "./dropdown-context";
const DropdownPopup = (props) => {
  const [local, rest] = splitProps(props, ["children", "class", "style", "showHandle"]);
  const ctx = useDropdownInternal();
  if (!ctx) {
    throw new Error(
      "[DropdownPopup] Dropdown \uCEF4\uD3EC\uB10C\uD2B8 \uB0B4\uBD80\uC5D0\uC11C \uC0AC\uC6A9\uD574\uC57C \uD569\uB2C8\uB2E4.\nDropdownPopup\uC740 \uBC18\uB4DC\uC2DC <Dropdown> \uCEF4\uD3EC\uB10C\uD2B8\uC758 \uC790\uC2DD\uC73C\uB85C \uBC30\uCE58\uD574\uC57C \uD569\uB2C8\uB2E4.",
    );
  }
  const showHandle = createMemo(() => local.showHandle ?? true);
  let popupRef;
  createEffect(() => {
    if (ctx.open()) {
      const frameId = requestAnimationFrame(() => {
        const style = ctx.popupStyle();
        Object.entries(style).forEach(([key, value]) => {
          if (value !== void 0) {
            popupRef.style.setProperty(key, String(value));
          }
        });
        popupRef.focus();
      });
      onCleanup(() => cancelAnimationFrame(frameId));
    }
  });
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      ctx.close();
      return;
    }
    if (!e.ctrlKey && !e.altKey) {
      const tabbables = tabbable(popupRef);
      const shouldFocusTrigger =
        (ctx.placement() === "bottom" &&
          e.key === "ArrowUp" &&
          document.activeElement === tabbables[0]) ||
        (ctx.placement() === "top" &&
          e.key === "ArrowDown" &&
          document.activeElement === tabbables.at(-1));
      if (shouldFocusTrigger) {
        e.preventDefault();
        e.stopPropagation();
        ctx.focusTrigger();
      }
    }
  };
  return /* @__PURE__ */ React.createElement(
    Show,
    { when: ctx.open() },
    /* @__PURE__ */ React.createElement(
      Portal,
      null,
      /* @__PURE__ */ React.createElement(
        Show,
        { when: ctx.isMobile() },
        /* @__PURE__ */ React.createElement("div", { class: backdrop, onClick: () => ctx.close() }),
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          "ref": popupRef,
          "id": `dropdown-popup-${ctx.id}`,
          "data-dropdown-id": ctx.id,
          "role": "menu",
          "tabIndex": -1,
          "class": [
            dropdownPopup({
              placement: ctx.placement(),
              mobile: ctx.isMobile(),
            }),
            local.class,
          ]
            .filterExists()
            .join(" "),
          "style": local.style,
          "onKeyDown": handleKeyDown,
          ...rest,
        },
        /* @__PURE__ */ React.createElement(
          Show,
          { when: ctx.isMobile() && showHandle() },
          /* @__PURE__ */ React.createElement("div", { class: mobileHandle }),
        ),
        /* @__PURE__ */ React.createElement("div", { class: dropdownPopupContent }, local.children),
      ),
    ),
  );
};
export { DropdownPopup };
//# sourceMappingURL=dropdown-popup.js.map
