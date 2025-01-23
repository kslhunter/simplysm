import { injectElementRef } from "./dom/element-ref.injector";
import { $effect } from "./hooks";

export function useRipple(enableFn?: () => boolean) {
  const _elRef = injectElementRef<HTMLElement>();

  $effect([], (onCleanup) => {
    Object.assign(_elRef.nativeElement.style, {
      position: "relative",
      overflow: "hidden",
    });

    const onMouseDown = (event: MouseEvent) => {
      if (enableFn && !enableFn()) return;

      const rect = _elRef.nativeElement.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      // const size = Math.max(_elRef.nativeElement.offsetWidth, _elRef.nativeElement.offsetHeight);

      let cursorEl = event.target as Element | null;
      while (true) {
        if (!cursorEl) {
          break;
        }
        else if (cursorEl  instanceof HTMLElement && cursorEl.isOffsetElement()) {
          break;
        }
        else {
          cursorEl = cursorEl.parentElement;
        }
      }

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      // const offsetY = cursorEl?.getRelativeOffset(_elRef.nativeElement).top ?? 0;
      // const offsetX = cursorEl?.getRelativeOffset(_elRef.nativeElement).left ?? 0;

      const indicatorEl = document.createElement("div");
      indicatorEl.className = "sd-active-effect-indicator";
      Object.assign(indicatorEl.style, {
        width: size * 2 + "px",
        height: size * 2 + "px",
        top: y - size + "px",
        left: x - size + "px",
        // top: offsetY + event.offsetY - size + "px",
        // left: offsetX + event.offsetX - size + "px",
      });

      _elRef.nativeElement.appendChild(indicatorEl);

      indicatorEl.ontransitionend = () => {
        if (getComputedStyle(indicatorEl).opacity === "0") {
          _elRef.nativeElement.removeChild(indicatorEl);
        }
      };
    };

    _elRef.nativeElement.addEventListener("mousedown", onMouseDown);

    onCleanup(() => {
      _elRef.nativeElement.removeEventListener("mousedown", onMouseDown);
    });
  });
}
