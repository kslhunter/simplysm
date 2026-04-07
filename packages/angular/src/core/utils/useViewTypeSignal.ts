import { computed, inject, type Signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { SdActivatedModalProvider } from "../providers/sd-activated-modal.provider";
import { useCurrentPageCodeSignal } from "./useCurrentPageCodeSignal";
import { useFullPageCodeSignal } from "./useFullPageCodeSignal";

export function useViewTypeSignal(getComp: () => object): Signal<TSdViewType> {
  const activatedModal = inject(SdActivatedModalProvider, { optional: true });
  const activatedRoute = inject(ActivatedRoute, { optional: true });

  const fullPageCode = useFullPageCodeSignal();
  const currPageCode = useCurrentPageCodeSignal();

  return computed<TSdViewType>(() => {
    if (activatedModal != null) {
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

export type TSdViewType = "page" | "modal" | "control";
