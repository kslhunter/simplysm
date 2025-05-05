import { $effect, $signal } from "../hooks/hooks";
import { injectElementRef } from "./element-ref.injector";

export function injectSizeSignals() {
  const elRef = injectElementRef();

  const offsetWidth = $signal(0);
  const offsetHeight = $signal(0);

  $effect([], (onCleanup) => {
    const resizeObserver = new ResizeObserver(() => {
      offsetWidth.set(elRef.nativeElement.offsetWidth);
      offsetHeight.set(elRef.nativeElement.offsetHeight);
    });
    resizeObserver.observe(elRef.nativeElement);

    onCleanup(() => {
      resizeObserver.disconnect();
    });
  });

  return {
    offsetWidth: offsetWidth.asReadonly(),
    offsetHeight: offsetHeight.asReadonly(),
  };
}
