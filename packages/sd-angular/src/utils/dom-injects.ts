import { afterNextRender, ElementRef, inject } from "@angular/core";
import { $effect, $signal } from "./hooks";

export function injectElementRef<T = HTMLElement>() {
  return inject<ElementRef<T>>(ElementRef);
}

export function injectSizeSignals() {
  const elRef = injectElementRef();
  let resizeObserver: ResizeObserver | undefined;

  const offsetWidth = $signal(0);
  const offsetHeight = $signal(0);

  afterNextRender(() => {
    resizeObserver = new ResizeObserver(() => {
      offsetWidth.set(elRef.nativeElement.offsetWidth);
      offsetHeight.set(elRef.nativeElement.offsetHeight);
    });
    resizeObserver.observe(elRef.nativeElement);
  });

  $effect([], (onCleanup) => {
    onCleanup(() => {
      resizeObserver?.disconnect();
    });
  });

  return {
    offsetWidth: offsetWidth.asReadonly(),
    offsetHeight: offsetHeight.asReadonly(),
  };
}
