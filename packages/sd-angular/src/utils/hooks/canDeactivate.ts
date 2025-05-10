import { inject, reflectComponentType } from "@angular/core";
import { ActivatedRoute, CanDeactivateFn, Route } from "@angular/router";
import { SdActivatedModalProvider } from "../../providers/sd-modal.provider";
import { injectElementRef } from "../dom/element-ref.injector";

const initializedRouteConfigSet = new Set<Route>();

export function canDeactivate(fn: () => boolean): void {
  const activatedRoute = inject(ActivatedRoute, { optional: true });
  const activatedModal = inject(SdActivatedModalProvider, { optional: true });
  const elRef = injectElementRef();

  if (activatedModal) {
    activatedModal.canDeactivefn = fn;
  }
  else if (activatedRoute) {
    if (!activatedRoute.routeConfig) return;
    if (
      reflectComponentType(activatedRoute.component as any)?.selector !==
      elRef.nativeElement.tagName.toLowerCase()
    ) {
      return;
    }

    if (!initializedRouteConfigSet.has(activatedRoute.routeConfig)) {
      initializedRouteConfigSet.add(activatedRoute.routeConfig);

      const canDeactivateFn: CanDeactivateFn<{ __sdCanDeactivate__(): boolean }> = (component) => {
        return fn();
      };
      activatedRoute.routeConfig.canDeactivate = [canDeactivateFn];
    }
  }
}