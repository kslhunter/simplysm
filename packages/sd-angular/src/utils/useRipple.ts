import { injectElementRef } from "./injectElementRef";
import { $effect } from "./$hooks";

export function useRipple(enableFn?: () => boolean) {
  const _elRef = injectElementRef<HTMLElement>();

  $effect([], (onCleanup) => {
    const onMouseDown = (event: MouseEvent) => {
      if (enableFn && !enableFn()) return;

      const size = Math.max(_elRef.nativeElement.offsetWidth, _elRef.nativeElement.offsetHeight);

      const indicatorEl = document.createElement("div");
      indicatorEl.className = "sd-active-effect-indicator";
      Object.assign(indicatorEl.style, {
        width: size * 2 + "px",
        height: size * 2 + "px",
        top: event.offsetY - size + "px",
        left: event.offsetX - size + "px",
      });

      _elRef.nativeElement.appendChild(indicatorEl);

      indicatorEl.ontransitionend = () => {
        if (getComputedStyle(indicatorEl).opacity === "0") {
          _elRef.nativeElement.removeChild(indicatorEl);
        }
      };
    };

    Object.assign(_elRef.nativeElement.style, {
      position: "relative",
      overflow: "hidden",
    });
    _elRef.nativeElement.addEventListener("mousedown", onMouseDown);

    onCleanup(() => {
      _elRef.nativeElement.removeEventListener("mousedown", onMouseDown);
    });
  });
}
