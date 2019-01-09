import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdIcon = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-icon"], o => o
    .style({
      "display": "inline-block",
      "pointer-events": "none"
    })
    .select(["&[sd-fixed-width=true]"], o => o
      .style({
        "width": "1.25em"
      })
    )
    .select([".fa-layers-counter"], o => o
      .style({
        "transform": "scale(0.4)"
      })
    )
    .select(["&[sd-dot=true] svg:nth-child(2)"], o => o
      .style({
        "color": s.vars.themeColor.danger.default
      })
    )
  );
