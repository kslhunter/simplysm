import { computed, inject, type Signal } from "@angular/core";
import { SdActivatedModalProvider } from "../modal/sd-activated-modal.provider";
import { SdAppStructureProvider } from "../app-structure/sd-app-structure.provider";
import { injectFullPageCodeSignal } from "./injectFullPageCodeSignal";
import { injectCurrentPageCodeSignal } from "./injectCurrentPageCodeSignal";

export function injectViewTitleSignal(): Signal<string> {
  const sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  const sdAppStructure = inject(SdAppStructureProvider);

  const fullPageCode = injectFullPageCodeSignal();
  const currPageCode = injectCurrentPageCodeSignal();

  return computed(() => {
    if (sdActivatedModal != null) {
      return sdActivatedModal.modalComponent()?.title() ?? "";
    }

    return sdAppStructure.findTitleByFullCode(currPageCode?.() ?? fullPageCode()) ?? "";
  });
}
