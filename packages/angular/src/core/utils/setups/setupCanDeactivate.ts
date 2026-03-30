import { ElementRef, inject, reflectComponentType } from "@angular/core";
import { ActivatedRoute, type CanDeactivateFn } from "@angular/router";
import { SdActivatedModalProvider } from "../../../ui/overlay/modal/sd-modal.provider";

export function setupCanDeactivate(fn: () => boolean): void {
  const activatedModal = inject(SdActivatedModalProvider, { optional: true });
  const activatedRoute = inject(ActivatedRoute, { optional: true });
  const elRef = inject(ElementRef);

  if (activatedModal != null) {
    activatedModal.canDeactivefn = fn;
    return;
  }

  if (activatedRoute) {
    if (!activatedRoute.routeConfig) return;

    const component = activatedRoute.component;
    if (component == null || typeof component === "string") return;

    if (
      reflectComponentType(component)?.selector !==
      elRef.nativeElement.tagName.toLowerCase()
    ) {
      return;
    }

    const canDeactivateFn: CanDeactivateFn<unknown> = () => fn();
    if (activatedRoute.routeConfig.canDeactivate == null) {
      activatedRoute.routeConfig.canDeactivate = [];
    }
    activatedRoute.routeConfig.canDeactivate.push(canDeactivateFn);
  }
}
