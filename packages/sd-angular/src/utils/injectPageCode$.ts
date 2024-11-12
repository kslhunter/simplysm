import { inject, Signal } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map } from "rxjs";
import { $computed } from "./$hooks";

export function injectPageCode$(): Signal<string> {
  const router = inject(Router);

  const url = toSignal(
    router.events.pipe(filter((event) => event instanceof NavigationEnd), map((event) => event.url)),
    { initialValue: router.url },
  );

  return $computed(() => url().split("/").slice(2).map((item) => item.split(/[;?]/).first()).join("."));
}
