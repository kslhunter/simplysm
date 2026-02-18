import { inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";

export function useQueryParamMapSignal() {
  const activatedRoute = inject(ActivatedRoute, { optional: true });

  if (activatedRoute) {
    return toSignal(activatedRoute.queryParamMap, {
      initialValue: activatedRoute.snapshot.queryParamMap,
    });
  }

  return undefined;
}
