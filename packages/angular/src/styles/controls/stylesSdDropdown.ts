import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdDropdown = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-dropdown > div"], o => o
    .style({
      "position": "relative"
    })
  );
