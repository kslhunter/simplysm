import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdHtmlEditor = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-html-editor"], o => o
    .style({
      "display": "block",
      "border": `1px solid ${s.vars.transColor.default}`
    })
    .select(["> sd-dock-container"], o => o
      .select(["> ._topbar"], o => o
        .style({
          "user-select": "none"
        })
        .select(["a"], o => o
          .style({
            "display": "inline-block",
            "padding": `${s.vars.gap.sm} 0`,
            "text-align": "center",
            "width": `${s.fns.stripUnit(s.vars.gap.sm) * 2 + s.fns.stripUnit(s.vars.lineHeight) * s.fns.stripUnit(s.vars.fontSize.default)}px`
          })
          .select(["&:hover"], o => o
            .style({
              "background": "rgba(0, 0, 0, .05)"
            })
          )
          .select(["&._selected"], o => o
            .style({
              "background": s.vars.themeColor.primary.default,
              "color": s.vars.textReverseColor.default
            })
          )
        )
      )
      .select(["> sd-pane"], o => o
        .select(["> div"], o => o
          .style({
            ...s.mixins.formControlBase(),
            "height": "100%"
          })
          .select(["&[contenteditable=true]"], o => o
            .style({
              "cursor": "text",
              "background": s.vars.themeColor.secondary.lightest
            })
          )
        )
        .select(["> textarea"], o => o
          .style({
            ...s.mixins.formControlBase(),
            "height": "100%",
            "background": s.vars.themeColor.secondary.lightest,
            "border": "none",
            "transition": "outline-color .1s linear",
            "outline": "1px solid transparent",
            "outline-offset": "-1px"
          })
          .select(["&::-webkit-input-placeholder"], o => o
            .style({
              "color": s.vars.textColor.lighter
            })
          )
          .select(["&:focus"], o => o
            .style({
              "outline-color": s.vars.themeColor.primary.default
            })
          )
        )
      )
    )
    .select(["&[sd-inset=true]"], o =>
      o.style({
        "height": "100%",
        "border": "none"
      })
    )
  );
