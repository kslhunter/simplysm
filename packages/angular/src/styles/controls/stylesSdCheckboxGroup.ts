import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdCheckboxGroup = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-checkbox-group"], o => o
    .style({})
  );
