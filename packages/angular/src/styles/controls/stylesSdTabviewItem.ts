import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdTabviewItem = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-tabview-item"], o => o
    .style({
      "display": `none`,
      "width": `100%`,
      "height": `100%`
    })
    .select(["&[sd-selected=true]"], o => o
      .style({
        "display": `block`
      })
    )
  );
