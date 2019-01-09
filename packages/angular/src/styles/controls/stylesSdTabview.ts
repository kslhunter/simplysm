import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdTabview = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-tabview"], o => o
    .style({})
  );
