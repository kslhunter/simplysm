import { inject } from "@angular/core";
import { SdActivatedModalProvider } from "../../providers/sd-modal.provider";
import { SdAppStructureProvider } from "../../providers/sd-app-structure.provider";
import { useFullPageCodeSignal } from "./use-full-page-code.signal";
import { useCurrentPageCodeSignal } from "./use-current-page-code.signal";
import { $computed } from "@simplysm/sd-angular";

export function useViewTitleSignal() {
  const _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
  const _sdAppStructure = inject(SdAppStructureProvider);

  const _fullPageCode = useFullPageCodeSignal();
  const _currPageCode = useCurrentPageCodeSignal();

  return $computed(
    () =>
      _sdActivatedModal?.modalComponent()?.title() ??
      _sdAppStructure.getTitleByFullCode(_currPageCode?.() ?? _fullPageCode()),
  );
}
