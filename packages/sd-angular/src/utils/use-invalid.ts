import { injectElementRef } from "./dom/element-ref.injector";
import { $effect } from "./hooks";
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
      _elRef.nativeElement.setAttribute("sd-invalid-messsage", invalidMessageSignal()!);
      _elRef.nativeElement.prependChild(indicatorEl);
    }
    else {
      _elRef.nativeElement.removeAttribute("sd-invalid-messsage");
      indicatorEl.remove();
      /*if ("removeChild" in _elRef.nativeElement) {
        _elRef.nativeElement.removeChild(indicatorEl);
      }*/
    }
  });
}
