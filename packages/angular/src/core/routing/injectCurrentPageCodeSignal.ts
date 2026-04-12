import { computed, inject, type Signal } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";

export function injectCurrentPageCodeSignal(): Signal<string> | undefined {
  const activatedRoute = inject(ActivatedRoute, { optional: true });

  if (activatedRoute) {
    const activatedUrlSegmentsSignals = activatedRoute.pathFromRoot
      .slice(2)
      .map((item) => toSignal(item.url, { initialValue: item.snapshot.url }));
    return computed(() => activatedUrlSegmentsSignals.map((item) => item()).join("."));
  }

  return undefined;
}
