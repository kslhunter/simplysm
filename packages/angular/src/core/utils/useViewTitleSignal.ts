import { computed, inject, type Signal } from "@angular/core";
import { SdActivatedModalProvider } from "../../ui/overlay/modal/sd-modal.provider";
import { SdAppStructureProvider } from "../providers/sd-app-structure.provider";
import { useFullPageCodeSignal } from "./useFullPageCodeSignal";
import { useCurrentPageCodeSignal } from "./useCurrentPageCodeSignal";

export function useViewTitleSignal(): Signal<string> {
  const activatedModal = inject(SdActivatedModalProvider, { optional: true });
  const sdAppStructure = inject(SdAppStructureProvider);

  const fullPageCode = useFullPageCodeSignal();
  const currPageCode = useCurrentPageCodeSignal();

  return computed(() => {
    if (activatedModal != null) {
      return activatedModal.modalComponent()?.title() ?? "";
    }

    return sdAppStructure.getTitleByFullCode(currPageCode?.() ?? fullPageCode());
  });
}
