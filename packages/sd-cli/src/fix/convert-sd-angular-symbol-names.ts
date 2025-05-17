/* eslint-disable no-console */
import convertSymbols from "./core/convert-symbol";

export default function convertSdAngularSymbolNames() {
  convertSymbols({
    "@simplysm/sd-angular#useBgTheme": "@simplysm/sd-angular#setupBgTheme",
    "@simplysm/sd-angular#canDeactivate": "@simplysm/sd-angular#setupCanDeactivate",
    "@simplysm/sd-angular#useRipple": "@simplysm/sd-angular#setupRipple",
    "@simplysm/sd-angular#useCumulateSelectedKeys": "@simplysm/sd-angular#setupCumulateSelectedKeys",
    "@simplysm/sd-angular#injectQueryParamMap$": "@simplysm/sd-angular#useActivateRouteManager",
    "@simplysm/sd-angular#ISdSheetColumnOrderingVM": "@simplysm/sd-angular#ISortingDef",

    "@angular/core#signal": "@simplysm/sd-angular#$signal",
    "@angular/core#computed": "@simplysm/sd-angular#$computed",
    "@angular/core#effect": "@simplysm/sd-angular#$effect",
    "@angular/core#afterRenderEffect": "@simplysm/sd-angular#$afterRenderEffect",
    "@angular/core#afterRenderComputed": "@simplysm/sd-angular#$afterRenderComputed",
    "@angular/core#resource": "@simplysm/sd-angular#$resource",
  });

  console.log("[완료] SdAngular 심볼 이름 변환 완료");
}