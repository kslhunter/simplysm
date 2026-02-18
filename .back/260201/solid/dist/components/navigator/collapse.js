import { createEffect, createSignal, onCleanup, onMount, splitProps } from "solid-js";
import { collapse } from "./collapse.css";
import { createResizeObserver } from "@solid-primitives/resize-observer";
import { objPick } from "@simplysm/core-common";
const Collapse = (props) => {
  const [local, styleProps, rest] = splitProps(
    props,
    [...collapse.variants(), "children"],
    ["class", "style"],
  );
  let contentRef;
  const [isMounted, setIsMounted] = createSignal(false);
  const [height, setHeight] = createSignal(local.open ? "auto" : "0px");
  const [contentHeight, setContentHeight] = createSignal("0px");
  onMount(() => {
    setContentHeight(`${contentRef.scrollHeight}px`);
    if (local.open) {
      setHeight(`${contentRef.scrollHeight}px`);
    }
    createResizeObserver(contentRef, () => {
      setContentHeight(`${contentRef.scrollHeight}px`);
    });
    const rafId = requestAnimationFrame(() => setIsMounted(true));
    onCleanup(() => cancelAnimationFrame(rafId));
  });
  createEffect(() => {
    if (!isMounted()) return;
    setHeight(local.open ? contentHeight() : "0px");
  });
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      "class": collapse(objPick(local, collapse.variants())),
      "style": { height: height() },
      "data-collapsed": !local.open ? "" : void 0,
      ...rest,
    },
    /* @__PURE__ */ React.createElement("div", { ...styleProps, ref: contentRef }, local.children),
  );
};
export { Collapse };
//# sourceMappingURL=collapse.js.map
