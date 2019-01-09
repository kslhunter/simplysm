import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdMultiSelectItem = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-multi-select-item"], o => o
    .style({
      "display": `block`,
      "padding": `${s.vars.gap.xs} ${s.vars.gap.sm}`,
      "cursor": `pointer`
    })
    .select(["&:hover"], o => o
      .style({
        "background": `${s.vars.transColor.dark}`
      })
    )
    .select(["> sd-checkbox > label"], o => o
      .style({
        "padding": `0 !important`
      })
    )
    .select(["&[hidden]"], o => o
      .style({
        "display": `none`
      })
    )
  );
