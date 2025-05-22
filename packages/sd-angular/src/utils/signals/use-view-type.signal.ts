import { inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { SdActivatedModalProvider } from "../../providers/sd-modal.provider";
import { $computed } from "../bindings/$computed";
import { injectParent } from "../injections/inject-parent";
import { useCurrentPageCodeSignal } from "./use-current-page-code.signal";
import { useFullPageCodeSignal } from "./use-full-page-code.signal";

export function useViewTypeSignal() {
  const _activatedRoute = inject(ActivatedRoute, { optional: true });
  const _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  const _parent = injectParent();

  const _fullPageCode = useFullPageCodeSignal();
  const _currPageCode = useCurrentPageCodeSignal();

  return $computed<TSdViewType>(() => {
    if (
      _activatedRoute &&
      _activatedRoute.component === _parent.constructor &&
      _fullPageCode() === _currPageCode?.()
    ) {
      return "page";
    } else if (_sdActivatedModal && _sdActivatedModal.contentComponent() === _parent) {
      return "modal";
    } else {
      return "control";
    }
  });
}

export type TSdViewType = "page" | "modal" | "control";
