import { type AbstractType, inject, Injector, type Signal, ViewContainerRef } from "@angular/core";
import { ActivatedRoute, NavigationEnd, type ParamMap, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map } from "rxjs";
import { $computed } from "./hooks";

export function injectPageCode$(): Signal<string> {
  const router = inject(Router);

  const url = toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.url),
    ),
    { initialValue: router.url },
  );

  return $computed(() => url()
    .split("/")
    .slice(2)
    .map((item) => item.split(/[;?]/).first())
    .join("."));
}

export function injectActivatedPageCode$(): Signal<string | undefined> {
  const activatedRoute = inject(ActivatedRoute, { optional: true });

  const activatedUrlSegmentsSignals = activatedRoute?.pathFromRoot.slice(2)
    .map(item => toSignal(item.url, { initialValue: item.snapshot.url }));
  return $computed(() =>
    activatedUrlSegmentsSignals?.map(item => item()).join("."),
  );
}

export function injectParamMap$(): Signal<ParamMap> {
  const activatedRoute = inject(ActivatedRoute);

  return toSignal(activatedRoute.paramMap, {
    initialValue: activatedRoute.snapshot.paramMap,
  });
}

export function injectQueryParamMap$(): Signal<ParamMap> {
  const activatedRoute = inject(ActivatedRoute);

  return toSignal(activatedRoute.queryParamMap, {
    initialValue: activatedRoute.snapshot.queryParamMap,
  });
}

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
      }
      else {
        throw new Error("부모 컴포넌트를 찾을 수 없습니다.");
      }
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
