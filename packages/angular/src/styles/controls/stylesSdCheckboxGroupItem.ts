import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdCheckboxGroupItem = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-checkbox-group-item"], o => o
    .style({})
  );
