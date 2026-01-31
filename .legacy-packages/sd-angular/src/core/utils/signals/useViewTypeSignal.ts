import { inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { SdActivatedModalProvider } from "../../../ui/overlay/modal/sd-modal.provider";
import { $computed } from "../bindings/$computed";
import { useCurrentPageCodeSignal } from "./useCurrentPageCodeSignal";
import { useFullPageCodeSignal } from "./useFullPageCodeSignal";

export function useViewTypeSignal(getComp: () => any) {
  const _activatedRoute = inject(ActivatedRoute, { optional: true });
  const _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });

  const _fullPageCode = useFullPageCodeSignal();
  const _currPageCode = useCurrentPageCodeSignal();

  return $computed<TSdViewType>(() => {
    let comp = getComp();

    if (
      _activatedRoute &&
      _activatedRoute.component === comp.constructor &&
      _fullPageCode() === _currPageCode?.()
    ) {
      return "page";
    } else if (_sdActivatedModal && _sdActivatedModal.contentComponent() === comp) {
      return "modal";
    } else {
      return "control";
    }
  });
}

export type TSdViewType = "page" | "modal" | "control";
