import { computed, inject } from "@angular/core";
import { SdActivatedModalProvider } from "../../../ui/overlay/modal/sd-modal.provider";
import { SdAppStructureProvider } from "../../providers/app/sd-app-structure.provider";
import { useFullPageCodeSignal } from "./useFullPageCodeSignal";
import { useCurrentPageCodeSignal } from "./useCurrentPageCodeSignal";

export function useViewTitleSignal() {
  const _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  const _sdAppStructure = inject(SdAppStructureProvider);

  const _fullPageCode = useFullPageCodeSignal();
  const _currPageCode = useCurrentPageCodeSignal();

  return computed(
    () =>
      _sdActivatedModal?.modalComponent()?.title() ??
      _sdAppStructure.getTitleByFullCode(_currPageCode?.() ?? _fullPageCode()),
  );
}
