import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdPagination = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-pagination"], o => o
    .style({
      "display": `block`
    })
    .select(["> a"], o => o
      .style({
        "display": `inline-block`,
        "padding": `0 ${s.vars.gap.xs}`
      })
      .select(["&[sd-selected=true]"], o => o
        .style({
          "text-decoration": `underline`
        })
      )
    )
  );
