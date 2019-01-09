import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdSelectItem = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-select-item"], o => o
    .style({
      "display": `block`,
      "padding": `${s.vars.gap.sm} ${s.vars.gap.default}`,
      "cursor": `pointer`
    })
    .select(["&:hover"], o => o
      .style({
        "background": `${s.vars.transColor.default}`
      })
    )
  );
