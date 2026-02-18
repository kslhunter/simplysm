import type { AbstractType } from "@angular/core";
import { inject, Injector, ViewContainerRef } from "@angular/core";

export function injectParent<T = any>(type?: AbstractType<T>): T;
export function injectParent<T = any>(
  type: AbstractType<T>,
  options: { optional: true },
): T | undefined;
export function injectParent<T = any>(
  type: AbstractType<T> | undefined,
  options: { optional: true },
): T | undefined;
export function injectParent<T = any>(
  type?: AbstractType<T>,
  options?: { optional: true },
): T | undefined {
  let currentInjector: Injector | null = inject(ViewContainerRef).injector;
  while (true) {
    if (!currentInjector) {
      if (options?.optional) {
        return undefined;
      } else {
        throw new Error("부모 컴포넌트를 찾을 수 없습니다.");
      }
    }

    const comp = (currentInjector as Injector & { _lView: unknown[] })["_lView"][8] as T;
    if (!type) {
      return comp;
    }
    if (comp instanceof type) {
      return comp;
    }

    currentInjector = currentInjector.get(Injector, undefined, { skipSelf: true, optional: true });
  }
}
