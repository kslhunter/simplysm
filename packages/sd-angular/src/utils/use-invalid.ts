import { injectElementRef } from "./dom/element-ref.injector";
import { $effect } from "./hooks/hooks";
import { StringUtils } from "@simplysm/sd-core-common";
import { Signal } from "@angular/core";

// TODO: 다른 invalid-indicator 대체
export function useInvalid(invalidMessageSignal: Signal<string | undefined>) {
  const _elRef = injectElementRef<HTMLElement>();

  Object.assign(_elRef.nativeElement.style, {
    position: "relative",
    // overflow: "hidden",
  });

  const indicatorEl = document.createElement("div");
  Object.assign(indicatorEl.style, {
    display: "block",
    position: "absolute",
    zIndex: "9999",
    background: "var(--theme-danger-default)",

    top: "var(--gap-xs)",
    left: "var(--gap-xs)",
    borderRadius: "100%",
    width: "var(--gap-sm)",
    height: "var(--gap-sm)",
  });

  $effect(() => {
    const el = _elRef.nativeElement;
    const msg = invalidMessageSignal();

    if (!StringUtils.isNullOrEmpty(msg)) {
      el.setAttribute("sd-invalid-message", msg);
      el.prependChild(indicatorEl);
    }
    else {
      el.removeAttribute("sd-invalid-message");
      indicatorEl.remove();
    }
  });
}
