import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdCard = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-card"], o => o
    .style({
      "display": "block",
      "width": "100%",
      "background": "white",
      ...s.mixins.elevation(1),
      "border-radius": "4px"
    })
  );
