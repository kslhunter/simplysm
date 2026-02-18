import { createEventListener } from "@solid-primitives/event-listener";
import { onCleanup } from "solid-js";
import { rippleOut, rippleStyle } from "./ripple.css";
function isOffsetElement(el) {
  return ["relative", "absolute", "fixed", "sticky"].includes(getComputedStyle(el).position);
}
const ripple = (el, value) => {
  const activeControllers = /* @__PURE__ */ new Set();
  onCleanup(() => {
    for (const ac of activeControllers) {
      ac.abort();
    }
    activeControllers.clear();
    el.querySelectorAll(`.${rippleStyle}`).forEach((rippleEl) => rippleEl.remove());
  });
  createEventListener(el, "pointerdown", (e) => {
    const options = value == null ? void 0 : value();
    const enabled =
      options === void 0 ||
      options === true ||
      (typeof options === "object" && options.enabled !== false);
    const shouldStopPropagation = typeof options === "object" && options.stopPropagation === true;
    if (!enabled) return;
    if (shouldStopPropagation) {
      e.stopPropagation();
    }
    if (!isOffsetElement(el)) {
      el.style.position = "relative";
    }
    el.style.overflow = "hidden";
    const rect = el.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const radius = Math.max(
      Math.hypot(clickX, clickY),
      Math.hypot(rect.width - clickX, clickY),
      Math.hypot(clickX, rect.height - clickY),
      Math.hypot(rect.width - clickX, rect.height - clickY),
    );
    const size = radius * 2;
    const rippleEl = document.createElement("span");
    rippleEl.classList.add(rippleStyle);
    rippleEl.style.width = rippleEl.style.height = `${size}px`;
    rippleEl.style.left = `${clickX - radius}px`;
    rippleEl.style.top = `${clickY - radius}px`;
    el.appendChild(rippleEl);
    let scaleAnimationEnded = false;
    let pointerReleased = false;
    const tryFadeOut = () => {
      if (scaleAnimationEnded && pointerReleased) {
        rippleEl.classList.add(rippleOut);
      }
    };
    const ac = new AbortController();
    activeControllers.add(ac);
    const cleanup = () => {
      ac.abort();
      activeControllers.delete(ac);
      rippleEl.remove();
    };
    const { signal } = ac;
    rippleEl.addEventListener(
      "animationend",
      () => {
        if (rippleEl.classList.contains(rippleOut)) {
          cleanup();
        } else {
          scaleAnimationEnded = true;
          tryFadeOut();
        }
      },
      { signal },
    );
    const onPointerRelease = () => {
      pointerReleased = true;
      tryFadeOut();
    };
    document.addEventListener("pointerup", onPointerRelease, { signal });
    document.addEventListener("pointercancel", onPointerRelease, { signal });
  });
};
export { ripple };
//# sourceMappingURL=ripple.js.map
