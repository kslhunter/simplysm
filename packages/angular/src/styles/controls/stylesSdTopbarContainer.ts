import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdTopbarContainer = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-topbar-container"], o => o
    .style({
      "display": `block`,
      "position": `relative`,
      "width": `100%`,
      "height": `100%`,
      "padding-top": `${s.vars.topbarHeight}`
    })
  );
