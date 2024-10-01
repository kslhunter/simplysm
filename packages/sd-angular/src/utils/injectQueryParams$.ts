import { inject } from "@angular/core";
import { ActivatedRoute, ParamMap } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { $computed } from "./$hooks";

export function injectQueryParamMap$(): { readonly value: ParamMap } {
  const activatedRoute = inject(ActivatedRoute);

  const queryParamMap = toSignal(activatedRoute.queryParamMap, {
    initialValue: activatedRoute.snapshot.queryParamMap,
  });

  return $computed(() => queryParamMap());
}
