import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdButton = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-button"], o => o
    .style({
      "display": "block",
      "position": "relative"
    })
    .select(["> button"], o => o
      .style({
        ...s.mixins.formControlBase(),
        "border": "1px solid transparent",
        ...s.mixins.elevation(2),
        "font-weight": "bold",
        "transition": "box-shadow .1s linear",
        "background": "white",
        "cursor": "pointer",
        "color": s.vars.textColor.default,
        "border-radius": "4px"
      })
      .select(["&:hover"], o => o
        .style({
          ...s.mixins.elevation(8)
        })
      )
      .select(["&:active"], o => o
        .style({
          "background": s.vars.transColor.dark
        })
      )
      .select(["&:disabled"], o => o
        .style({
          "background": "transparent",
          "cursor": "default",
          "color": s.vars.textColor.default
        })
      )
      .select(["&:focus"], o => o
        .style({
          "outline-color": "transparent",
          ...s.mixins.elevation(8)
        })
      )
    )
    .forEach(Object.keys(s.vars.themeColor), (o, key) => o
      .select([`&[sd-theme=${key}] > button`], o => o
        .style({
          "background": s.vars.themeColor[key].default,
          "border-color": s.vars.themeColor[key].default,
          "color": s.vars.textReverseColor.default
        })
        .select(["&:active"], o => o
          .style({
            "background": s.vars.themeColor[key].darker
          })
        )
        .select(["&:disabled"], o => o
          .style({
            "background": s.vars.themeColor.grey.default,
            "border-color": s.vars.themeColor.grey.default,
            "cursor": "default"
          })
        )
      )
    )
    .select(["&[sd-size=sm] > button"], o => o
      .style({
        "padding": `${s.vars.gap.xs} ${s.vars.gap.sm}`
      })
    )
    .select(["&[sd-size=lg] > button"], o => o
      .style({
        "padding": `${s.vars.gap.default} ${s.vars.gap.lg}`
      })
    )
    .select(["&[sd-inline=true]"], o => o
      .style({
        "display": "inline-block"
      })
      .select(["> button"], o => o
        .style({
          "width": "auto"
        })
      )
    )
    .select(["&[sd-invalid=true] > ._invalid-indicator"], o => o
      .style({
        "display": "block",
        "position": "absolute",
        "top": "2px",
        "left": "2px",
        "border-radius": "100%",
        "width": "4px",
        "height": "4px",
        "background": s.vars.themeColor.danger.default
      })
    )
    .select(["&[sd-inset=true]"], o => o
      .select(["> button"], o => o
        .style({
          "border": `none !important`,
          "box-shadow": `none !important`
        })
        .select(["&:hover"], o => o
          .style({
            "background": s.vars.transColor.default
          })
        )
        .select(["&:active"], o => o
          .style({
            "background": s.vars.transColor.dark
          })
        )
        .select(["&:disabled"], o => o
          .style({
            "background": "transparent"
          })
        )
      )
      .forEach(Object.keys(s.vars.themeColor), (o, key) => o
        .select([`&[sd-theme=${key}] > button`], o => o
          .style({
            "background": s.vars.themeColor[key].default
          })
          .select(["&:hover"], o => o
            .style({
              "background": s.vars.themeColor[key].dark
            })
          )
          .select(["&:active"], o => o
            .style({
              "background": s.vars.themeColor[key].darker
            })
          )
          .select(["&:disabled"], o => o
            .style({
              "background": s.vars.themeColor.grey.default
            })
          )
        )
      )
    )
  );
