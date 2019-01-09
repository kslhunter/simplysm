import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdList = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-list"], o => o
    .style({
      "display": "block",
      "user-select": "none"
    })
  );
