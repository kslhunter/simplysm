import { injectElementRef } from "./dom/element-ref.injector";
import { $effect } from "./hooks/hooks";
import { StringUtils } from "@simplysm/sd-core-common";
import { Signal } from "@angular/core";

export function useInvalid(invalidMessageSignal: Signal<string | undefined>) {
  const _elRef = injectElementRef<HTMLElement>();

  Object.assign(_elRef.nativeElement.style, {
    position: "relative",
    overflow: "hidden",
  });

  const indicatorEl = document.createElement("div");
  indicatorEl.className = "sd-invalid-indicator";

  $effect([invalidMessageSignal], () => {
    if (!StringUtils.isNullOrEmpty(invalidMessageSignal())) {
      _elRef.nativeElement.setAttribute("sd-invalid-message", invalidMessageSignal()!);
      _elRef.nativeElement.prependChild(indicatorEl);
    }
    else {
      _elRef.nativeElement.removeAttribute("sd-invalid-message");
      indicatorEl.remove();
      /*if ("removeChild" in _elRef.nativeElement) {
        _elRef.nativeElement.removeChild(indicatorEl);
      }*/
    }
  });
}
