import { AbstractType, inject, Injector, ViewContainerRef } from "@angular/core";

export function injectParent<T>(type: AbstractType<T>): T {
  let currentInjector = inject(ViewContainerRef).injector;
  while (true) {
    const comp = currentInjector["_lView"][8];
    if (comp instanceof type) {
      return comp;
    }

    currentInjector = currentInjector.get(Injector, undefined, { skipSelf: true });
    return comp;
  }
}
