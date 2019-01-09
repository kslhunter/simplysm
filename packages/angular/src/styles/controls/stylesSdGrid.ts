import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdGrid = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-grid"], o => o
    .style({
      "display": "block",
      "width": "100%",
      "height": "100%"
    })
  );
