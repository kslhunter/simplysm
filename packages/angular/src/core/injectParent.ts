import { type AbstractType, inject, Injector, ViewContainerRef } from "@angular/core";

export function injectParent<T = object>(): T;
export function injectParent<T = object>(type: AbstractType<T>): T;
export function injectParent<T = object>(
  type: AbstractType<T>,
  options: { optional: true },
): T | undefined;
export function injectParent<T = object>(
  type?: AbstractType<T>,
  options?: { optional: true },
): T | undefined {
  let currentInjector: Injector | undefined = inject(ViewContainerRef).injector;
  while (currentInjector != null) {
    // Angular internal: NodeInjector._lView[CONTEXT=8]에 컴포넌트 인스턴스 저장
    const lView: unknown[] | undefined = (
      currentInjector as unknown as { _lView?: unknown[] }
    )._lView;
    if (lView == null) {
      break;
    }

    const comp = lView[8];
    // 컴포넌트 인스턴스 검증: null, primitive, plain object({})는 건너뜀
    // Angular 내부 슬롯 변경 시 잘못된 객체 반환을 방지하는 방어 코드
    if (comp != null && typeof comp === "object" && comp.constructor !== Object) {
      if (type == null) {
        return comp as T;
      }
      if (comp instanceof type) {
        return comp as T;
      }
    }

    currentInjector = currentInjector.get(Injector, undefined, {
      skipSelf: true,
      optional: true,
    }) as Injector | undefined;
  }

  if (options?.optional) {
    return undefined;
  }
  throw new Error("부모 컴포넌트를 찾을 수 없습니다.");
}
