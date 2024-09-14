import { computed, inject } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map } from "rxjs";

export function injectPageRouter() {
  const router = inject(Router, { optional: true });
  if (!router) {
    return undefined;
  }

  const url = toSignal(
    router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.url),
    ),
    {
      initialValue: router.url,
    },
  );

  const pageCode = computed(() =>
    url()
      .split("/")
      .slice(2)
      .map((item) => item.split(/[;?]/).first())
      .join("."),
  );

  return {
    url,
    pageCode
  };
}
