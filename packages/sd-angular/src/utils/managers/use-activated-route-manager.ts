import { inject, Signal } from "@angular/core";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { $computed } from "../bindings/$computed";

export function useActivatedRouteManager(): {
  paramMap: Signal<ParamMap>;
  queryParamMap: Signal<ParamMap>;
  pageCode: Signal<string>;
} | undefined {
  const activatedRoute = inject(ActivatedRoute, { optional: true });

  if (activatedRoute) {
    const paramMap = toSignal(
      activatedRoute.paramMap,
      { initialValue: activatedRoute.snapshot.paramMap },
    );

    const queryParamMap = toSignal(
      activatedRoute.paramMap,
      { initialValue: activatedRoute.snapshot.paramMap },
    );


    const activatedUrlSegmentsSignals = activatedRoute.pathFromRoot.slice(2)
      .map(item => toSignal(item.url, { initialValue: item.snapshot.url }));
    const pageCode = $computed(() =>
      activatedUrlSegmentsSignals.map(item => item()).join("."),
    );

    return {
      paramMap,
      queryParamMap,
      pageCode,
    };
  }

  return undefined;
}