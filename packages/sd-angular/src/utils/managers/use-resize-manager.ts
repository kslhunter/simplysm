import { injectElementRef } from "../injections/inject-element-ref";
import { $signal } from "../bindings/$signal";
import { $effect } from "../bindings/$effect";

export function useResizeManager() {
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
