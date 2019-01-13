import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdListItem = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-list-item"], o => o
    .style({
      "display": "block"
    })
    .select(["> label"], o => o
      .style({
        "display": "block",
        "padding": `${s.vars.gap.sm} ${s.vars.gap.default}`,
        "transition": "background .1s linear"
      })
      .select(["> ._angle-icon"], o => o
        .style({
          "float": "right",
          "transition": "transform .1s ease-in"
        })
      )
      .select(["&:focus"], o => o
        .style({
          "outline-color": "transparent"
        })
      )
    )
    .select(["> ._child"], o => o
      .style({
        "overflow": "hidden"
      })
      .select(["> ._child-content"], o => o
        .style({
          "transition": "margin-top .1s ease-out",
          "background": "rgba(0, 0, 0, .05)"
        })
      )
    )
    .select(["&[sd-clickable=true]"], o => o
      .select(["> label"], o => o
        .style({
          "cursor": "pointer"
        })
        .select(["&:hover"], o => o
          .style({
            "background": "rgba(0, 0, 0, .1)"
          })
        )
      )
    )
    .select(["&[sd-open=true]"], o => o
      .select(["> label > ._angle-icon"], o => o
        .style({
          "transform": "rotate(-90deg)",
          "transition": "transform .1s ease-out"
        })
      )
      .select(["> ._child > ._child-content"], o => o
        .style({
          "transition": "margin-top .1s ease-in"
        })
      )
    )
    .select(["&[sd-size=sm] > label"], o => o
      .style({
        "padding": `${s.vars.gap.xs} ${s.vars.gap.sm}`
      })
    )
    .select(["&[sd-size=lg] > label"], o => o
      .style({
        "padding": `${s.vars.gap.default} ${s.vars.gap.lg}`
      })
    )
    .select(["&[sd-selected=true] > label"], o => o
      .style({
        /*"background": s.vars.themeColor.primary.default,
        "color": s.vars.textReverseColor.default*/
        "color": s.vars.themeColor.primary.default,
        "font-weight": "bold"
      })
    )
    .select(["&[sd-disabled=true]"], o => o
      .style({
        "pointer-events": "none"
      })
      .select(["> label"], o => o
        .style({
          // "background": s.vars.transColor.default,
          "color": s.vars.textColor.lighter,
          "cursor": "default"
        })
      )
    )
    .select(["&[sd-header=true] > label"], o => o
      .select(["> label"], o => o
        .style({
          "cursor": "default",
          "background": "transparent",
          "padding": `${s.vars.gap.xs} ${s.vars.gap.default}`,
          "color": s.vars.textColor.light,
          "font-size": s.vars.fontSize.sm,
          "margin-top": s.vars.gap.sm
        })
        .select(["&:hover"], o => o
          .style({
            "background": "transparent"
          })
        )
        .select(["> ._angle-icon"], o => o
          .style({
            "display": "none"
          })
        )
      )
      .select(["> ._child > ._child-content"], o => o
        .style({
          "margin-top": "0 !important",
          "background": "transparent !important"
        })
      )
    )
  );
