import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdView = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-view"], o => o
    .style({
      "display": `block`,
      "background": `white`
    })
  );
