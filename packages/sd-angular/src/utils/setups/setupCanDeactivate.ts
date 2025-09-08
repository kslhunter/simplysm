import { inject, reflectComponentType } from "@angular/core";
import { ActivatedRoute, CanDeactivateFn } from "@angular/router";
import { SdActivatedModalProvider } from "../../providers/SdModalProvider";
import { injectElementRef } from "../injections/injectElementRef";

export function setupCanDeactivate(fn: () => boolean): void {
  const activatedRoute = inject(ActivatedRoute, { optional: true });
  const activatedModal = inject(SdActivatedModalProvider, { optional: true });
  const elRef = injectElementRef();

  if (activatedModal) {
    activatedModal.canDeactivefn = fn;
  } else if (activatedRoute) {
    if (!activatedRoute.routeConfig) return;
    if (
      reflectComponentType(activatedRoute.component as any)?.selector !==
      elRef.nativeElement.tagName.toLowerCase()
    ) {
      return;
    }

    const canDeactivateFn: CanDeactivateFn<{ __sdCanDeactivate__(): boolean }> = () => {
      return fn();
    };
    activatedRoute.routeConfig.canDeactivate = [canDeactivateFn];
  }
}
