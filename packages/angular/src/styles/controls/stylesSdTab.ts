import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdTab = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-tab"], o => o
    .style({
      "display": `block`
    })
  );
