import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdTabItem = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-tab-item"], o => o
    .style({
      "display": `inline-block`,
      "padding": `${s.vars.gap.sm} ${s.vars.gap.default}`,
      "cursor": `pointer`
    })
    .select(["&:hover"], o => o
      .style({
        "background": `rgba(0, 0, 0, .05)`
      })
    )
    .select(["&[sd-selected=true]"], o => o
      .style({
        "background": `${s.vars.themeColor.primary.default}`,
        "color": `${s.vars.textReverseColor.default}`
      })
    )
  );
