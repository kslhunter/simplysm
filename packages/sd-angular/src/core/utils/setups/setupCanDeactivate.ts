import { inject, reflectComponentType } from "@angular/core";
import type { CanDeactivateFn } from "@angular/router";
import { ActivatedRoute } from "@angular/router";
import { SdActivatedModalProvider } from "../../../ui/overlay/modal/sd-modal.provider";
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
