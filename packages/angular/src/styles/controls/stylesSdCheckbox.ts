import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdCheckbox = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-checkbox"], o => o
    .style({
      "color": s.vars.textColor.default
    })
    .select(["> label"], o => o
      .style({
        ...s.mixins.formControlBase(),
        "user-select": "none",
        "color": "inherit",
        "cursor": "pointer",
        "position": "relative"
      })
      .select(["> ._indicator_rect"], o => o
        .style({
          "position": "absolute",
          "display": "block",
          "width": s.vars.lineHeight,
          "height": s.vars.lineHeight,
          "border": `1px solid ${s.vars.transColor.default}`,
          "background": "white",
          "vertical-align": "top",
          "transition": "border-color .1s linear"
        })
      )
      .select(["> ._indicator"], o => o
        .style({
          "display": "inline-block",
          "position": "relative",
          "opacity": "0",
          "transition": "opacity .1s linear",
          "color": s.vars.textColor.default,
          "width": s.vars.lineHeight,
          "height": s.vars.lineHeight,
          "vertical-align": "top",
          "padding-left": "1px"
        })
      )
      .select(["> ._content"], o => o
        .style({
          "display": "inline-block",
          "vertical-align": "top",
          "text-indent": s.vars.gap.xs
        })
        .select(["> *"], o => o
          .style({
            "text-indent": "0"
          })
        )
      )
      .select(["> input:disabled + ._indicator_rect"], o => o
        .style({
          "background": s.vars.bgColor
        })
      )
      .select(["&:focus"], o => o
        .style({
          "outline-color": "transparent"
        })
        .select(["> ._indicator_rect"], o => o
          .style({
            "border-color": s.vars.themeColor.primary.default
          })
        )
      )
    )
    .select(["&[sd-checked=true] > label > ._indicator"], o => o
      .style({
        "opacity": "1"
      })
    )
    .select(["&[sd-inline=true]"], o => o
      .style({
        "display": "inline-block"
      })
      .select(["> label"], o => o
        .style({
          "padding-left": "0"
        })
      )
    )
    .select(["&[sd-radio=true]"], o => o
      .select(["> label"], o => o
        .select(["> ._indicator_rect"], o => o
          .style({
            "border-radius": "100%"
          })
        )
        .select(["> ._indicator"], o => o
          .style({
            "padding": s.vars.gap.xs
          })
        )
        .select(["> ._indicator > div"], o => o
          .style({
            "border-radius": "100%",
            "background": s.vars.textColor.default,
            "width": "100%",
            "height": "100%"
          })
        )
      )
    )
  );
