/* eslint-disable no-console */
import convertSymbols from "./core/convert-symbol";

export default function convertSdAngularSymbolNames() {
  convertSymbols({
    "@simplysm/sd-angular": {
      useBgTheme: "setupBgTheme",
      canDeactivate: "setupCanDeactivate",
      useRipple: "setupRipple",
      useCumulateSelectedKeys: "setupCumulateSelectedKeys",
      injectQueryParamMap$: "useActivateRouteManager",
      ISdSheetColumnOrderingVM: "ISortingDef",
    },
  });

  console.log("[완료] SdAngular 심볼 이름 변환 완료");
}