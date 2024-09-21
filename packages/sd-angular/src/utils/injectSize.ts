import { afterNextRender, ElementRef, inject } from "@angular/core";
import { $signal, beforeDestroy } from "./$hooks";

export function injectSize() {
  const elRef = inject<ElementRef<HTMLElement>>(ElementRef);
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

  beforeDestroy(() => {
    resizeObserver?.disconnect();
  });

  return { offsetWidth, offsetHeight };
}
