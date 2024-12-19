import { inject, type Signal } from "@angular/core";
import { ActivatedRoute, type ParamMap } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";

export function injectQueryParamMap$(): Signal<ParamMap> {
  const activatedRoute = inject(ActivatedRoute);

  return toSignal(activatedRoute.queryParamMap, {
    initialValue: activatedRoute.snapshot.queryParamMap,
  });
}
