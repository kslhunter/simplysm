import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdForm = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-form"], o => o
    .select(["&[sd-inline=true]"], o => o
      .style({
        "display": "inline-block",
        "vertical-align": "middle"
      })
      .select(["> form"], o => o
        .style({
          "display": "inline-block",
          "margin-bottom": `-${s.vars.gap.sm}`
        })
        .select(["> sd-form-item"], o => o
          .style({
            "display": "inline-block",
            "margin-bottom": s.vars.gap.sm,
            "margin-right": s.vars.gap.default
          })
          .select(["&:last-child"], o => o
            .style({
              "margin-right": "0"
            })
          )
          .select(["> label"], o => o
            .style({
              "display": "inline-block",
              "vertical-align": "middle",
              "margin-right": s.vars.gap.sm,
              "margin-bottom": "0"
            })
          )
          .select(["> div"], o => o
            .style({
              "display": "inline-block",
              "vertical-align": "middle"
            })
            .select(["> sd-checkbox > label"], o => o
              .style({

                "display": "inline-block",
                "width": "auto"
              })
            )
          )
        )
      )
    )
  );
