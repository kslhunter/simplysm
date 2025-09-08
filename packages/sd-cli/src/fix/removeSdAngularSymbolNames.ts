/* eslint-disable no-console */

import removeSymbols from "./core/removeSymbols";

export default function removeSdAngularSymbolNames() {
  removeSymbols(["@simplysm/sd-angular#TemplateTargetDirective"]);

  console.log("[완료] SdAngular 심볼 삭제 완료");
}
