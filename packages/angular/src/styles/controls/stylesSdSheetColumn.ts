import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdSheetColumn = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-sheet-column"], o => o
    .style({})
  );
