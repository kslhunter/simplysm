import { inject, Signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { $computed } from "../hooks/hooks";

export function injectActivatedPageCode$(): Signal<string | undefined> {
  const activatedRoute = inject(ActivatedRoute, { optional: true });

  const activatedUrlSegmentsSignals = activatedRoute?.pathFromRoot.slice(2)
    .map(item => toSignal(item.url, { initialValue: item.snapshot.url }));
  return $computed(() =>
    activatedUrlSegmentsSignals?.map(item => item()).join("."),
  );
}