import { inject, Signal } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map } from "rxjs";
import { $computed } from "../bindings/$computed";

export function useRouterManager(): {
  pageCode: Signal<string>
} {
  const router = inject(Router);

  const url = toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.url),
    ),
    { initialValue: router.url },
  );

  const pageCode = $computed(() => url()
    .split("/")
    .slice(2)
    .map((item) => item.split(/[;?]/).first())
    .join("."));

  return {
    pageCode,
  };
}