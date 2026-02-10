import { inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import { $computed } from "../bindings/$computed";

export function useCurrentPageCodeSignal() {
  const activatedRoute = inject(ActivatedRoute, { optional: true });

  if (activatedRoute) {
    const activatedUrlSegmentsSignals = activatedRoute.pathFromRoot
      .slice(2)
      .map((item) => toSignal(item.url, { initialValue: item.snapshot.url }));
    return $computed(() => activatedUrlSegmentsSignals.map((item) => item()).join("."));
  }

  return undefined;
}
