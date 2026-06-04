import { computed, ElementRef, inject, reflectComponentType, type Signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { SdActivatedModalProvider } from "../modal/sd-activated-modal.provider";
import { injectCurrentPageCodeSignal } from "./injectCurrentPageCodeSignal";
import { injectFullPageCodeSignal } from "./injectFullPageCodeSignal";

export function injectViewTypeSignal(): Signal<SdViewType> {
  const sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  const activatedRoute = inject(ActivatedRoute, { optional: true });
  const elRef = inject(ElementRef);

  const fullPageCode = injectFullPageCodeSignal();
  const currPageCode = injectCurrentPageCodeSignal();

  return computed<SdViewType>(() => {
    if (sdActivatedModal != null) {
      return "modal";
    }

    if (activatedRoute) {
      const component = activatedRoute.component;
      if (component == null || typeof component === "string") {
        return "control";
      }
      if (
        reflectComponentType(component)?.selector !==
        elRef.nativeElement.tagName.toLowerCase()
      ) {
        return "control";
      }
      
      if (fullPageCode() === currPageCode?.()) {
        return "page";
      }
    }

    return "control";
  });
}

export type SdViewType = "page" | "modal" | "control";
