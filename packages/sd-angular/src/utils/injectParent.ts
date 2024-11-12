import { AbstractType, inject, Injector, ViewContainerRef } from "@angular/core";

export function injectParent<T = any>(type?: AbstractType<T>): T {
  let currentInjector: Injector | null = inject(ViewContainerRef).injector;
  while (true) {
    if (!currentInjector) {
      throw new Error("부모 컴포넌트를 찾을 수 없습니다.");
    }

    const comp = currentInjector["_lView"][8];
    if (!type) {
      return comp;
    }
    if (comp instanceof type) {
      return comp;
    }

    currentInjector = currentInjector.get(Injector, undefined, { skipSelf: true, optional: true });
  }
}
