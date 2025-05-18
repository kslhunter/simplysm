import { inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";

export function useParamMapSignal() {
  const activatedRoute = inject(ActivatedRoute, { optional: true });

  if (activatedRoute) {
    return toSignal(activatedRoute.paramMap, { initialValue: activatedRoute.snapshot.paramMap });
  }

  return undefined;
}