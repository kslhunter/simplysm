import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdViewItem = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-view-item"], o => o
    .style({
      "display": `none`
    })
    .select(["&[sd-selected=true]"], o => o
      .style({
        "display": `block`
      })
    )
  );
