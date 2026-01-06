import { inject } from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import { NavigationEnd, Router } from "@angular/router";
import { filter, map } from "rxjs";
import { $computed } from "../bindings/$computed";

export function useFullPageCodeSignal() {
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