import { afterNextRender, ElementRef, inject } from "@angular/core";
import { $effect } from "./$hooks";
import { $reactive } from "./$reactive";

export function injectElementResize() {
  const elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  let resizeObserver: ResizeObserver | undefined;

  const offsetWidth$ = $reactive(0);
  const offsetHeight$ = $reactive(0);

  afterNextRender(() => {
    resizeObserver = new ResizeObserver(() => {
      offsetWidth$.value = elRef.nativeElement.offsetWidth;
      offsetHeight$.value = elRef.nativeElement.offsetHeight;
    });
    resizeObserver.observe(elRef.nativeElement);
  });

  $effect([], (onCleanup) => {
    onCleanup(() => {
      resizeObserver?.disconnect();
    });
  });

  return {
    width: offsetWidth$,
    height: offsetHeight$,
  };
}
