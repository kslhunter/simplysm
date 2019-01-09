import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdMarkdownEditor = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-markdown-editor"], o => o
    .style({
      "display": "block",
      "border": `1px solid ${s.vars.transColor.default}`
    })
    .select(["> sd-dock-container"], o => o
      .select(["> ._toolbar"], o => o
        .style({
          "user-select": "none"
        })
        .select(["> a"], o => o
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
      .select(["> sd-pane > ._editor"], o => o
        .style({
          "position": "relative",
          "width": "100%",
          "height": "100%"
        })
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
          .select(["> ._invalid-indicator"], o => o
            .style({
              "display": "none"
            })
          )
          .select(["> input[sd-invalid=true] + ._invalid-indicator", "> input:invalid + ._invalid-indicator"], o => o
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
        )
        .select(["> ._dragover"], o => o
          .style({
            "display": "none",
            "pointer-events": "none",
            "position": "absolute",
            "top": "0",
            "left": "0",
            "width": "100%",
            "height": "100%",
            "background": "rgba(0, 0, 0, .05)",
            "font-size": s.vars.fontSize.h1,
            "color": "rgba(0, 0, 0, .3)",
            "text-align": "center",
            "padding-top": "20px"
          })
        )
      )
      .select(["> sd-pane > ._preview"], o => o
        .style({
          "padding": s.vars.gap.sm,
          "height": "100%",
          "overflow": "auto",
          "background": "white"
        })
        .select(["ol"], o => o
          .style({
            "padding-left": "20px"
          })
        )
        .select(["code"], o => o
          .style({
            "background": "rgba(0, 0, 0, .05)",
            "border-radius": "2px"
          })
        )
        .select(["pre"], o => o
          .style({
            "background": "rgba(0, 0, 0, .05)",
            "padding": `${s.vars.gap.sm} ${s.vars.gap.default}`,
            "border-radius": "2px",
            "white-space": "pre-wrap"
          })
          .select(["code"], o => o
            .style({
              "background": "transparent"
            })
          )
        )
        .select(["p"], o => o
          .style({
            "margin-top": s.vars.gap.sm,
            "margin-bottom": s.vars.gap.sm
          })
        )
      )
    )
    .select(["&[sd-disabled=true] > sd-dock-container > sd-pane > ._preview"], o => o
      .style({
        "height": "auto"
      })
    )
    .select(["&[sd-dragover=true] > sd-dock-container > sd-pane > ._editor > ._dragover"], o => o
      .style({
        "display": "block"
      })
    )
  );
