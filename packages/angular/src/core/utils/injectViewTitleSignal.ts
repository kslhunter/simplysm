import { computed, inject, type Signal } from "@angular/core";
import { SdActivatedModalProvider } from "../providers/sd-activated-modal.provider";
import { SdAppStructureProvider } from "../providers/sd-app-structure.provider";
import { injectFullPageCodeSignal } from "./injectFullPageCodeSignal";
import { injectCurrentPageCodeSignal } from "./injectCurrentPageCodeSignal";

export function injectViewTitleSignal(): Signal<string> {
  const activatedModal = inject(SdActivatedModalProvider, { optional: true });
  const sdAppStructure = inject(SdAppStructureProvider);

  const fullPageCode = injectFullPageCodeSignal();
  const currPageCode = injectCurrentPageCodeSignal();

  return computed(() => {
    if (activatedModal != null) {
      return activatedModal.modalComponent()?.title() ?? "";
    }

    try {
      return sdAppStructure.getTitleByFullCode(currPageCode?.() ?? fullPageCode());
    } catch {
      return "";
    }
  });
}
