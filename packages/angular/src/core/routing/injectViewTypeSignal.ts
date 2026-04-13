import { computed, inject, type Signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { SdActivatedModalProvider } from "../modal/sd-activated-modal.provider";
import { injectCurrentPageCodeSignal } from "./injectCurrentPageCodeSignal";
import { injectFullPageCodeSignal } from "./injectFullPageCodeSignal";

export function injectViewTypeSignal(getComp: () => object): Signal<SdViewType> {
  const sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  const activatedRoute = inject(ActivatedRoute, { optional: true });

  const fullPageCode = injectFullPageCodeSignal();
  const currPageCode = injectCurrentPageCodeSignal();

  return computed<SdViewType>(() => {
    if (sdActivatedModal != null) {
      return "modal";
    }

    const comp = getComp();

    if (
      activatedRoute &&
      activatedRoute.component === comp.constructor &&
      fullPageCode() === currPageCode?.()
    ) {
      return "page";
    }

    return "control";
  });
}

export type SdViewType = "page" | "modal" | "control";
