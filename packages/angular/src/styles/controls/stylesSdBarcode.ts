import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdBarcode = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-barcode"], o => o
    .style({})
  );

// ([^\n\s]*): (.*);
// "$1": `$2`,
