import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdGridItem = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-grid-item"], o => o
    .style({
      "display": "inline-block",
      "vertical-align": "top"
    })
  );
