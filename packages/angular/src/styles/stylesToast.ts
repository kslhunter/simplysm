import {SdStylePresets} from "../style/SdStylePresets";
import {SdStyleBuilder} from "../style/SdStyleBuilder";

//tslint:disable:no-shadowed-variable
export const stylesToast = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["._sd-toast-container"], o => o
    .style({
      "display": "block",
      "position": "fixed",
      "top": "0",
      "left": "0",
      "height": "100%",
      "pointer-events": "none",
      "padding": s.vars.gap.lg,
      "z-index": `${s.vars.zIndex.toast}`
    })
    .select(["> ._sd-toast"], o => o
      .style({
        "display": "block",
        "margin-bottom": s.vars.gap.sm
      })
      .select(["> ._sd-toast-block"], o => o
        .style({
          "display": "inline-block",
          "color": "white",
          "animation": "_sd-toast-show .1s ease-out forwards",
          "transform": "translateX(-100%)",
          "border-radius": "2px",
          "opacity": ".9",
          ...s.mixins.elevation(6)
        })
        .select(["> ._sd-toast-message"], o => o
          .style({
            "padding": `${s.vars.gap.sm} ${s.vars.gap.default}`
          })
        )
        .select(["> ._sd-toast-progress"], o => o
          .style({
            "background": s.vars.themeColor.grey.default,
            "height": "4px",
            "border-radius": "2px"
          })
          .select(["> ._sd-toast-progress-bar"], o => o
            .style({
              "height": "4px",
              "transition": "width 1s ease-out"
            })
          )
        )
      )
      .forEach(Object.keys(s.vars.themeColor), (o, key) => o
        .select([`&._sd-toast-${key}`], o => o
          .select(["> ._sd-toast-block"], o => o
            .style({
              "background": s.vars.themeColor[key].default
            })
            .select(["> ._sd-toast-progress > ._sd-toast-progress-bar"], o => o
              .style({
                "background": s.vars.themeColor[key].default
              })
            )
          )
        )
      )
    )
  )
  .keyFrame("_sd-toast-show", {
    from: {
      "left": `calc(${s.vars.gap.lg} - 100%)`,
      "transform": "translateX(left)"
    },
    to: {
      "transform": "none"
    }
  });
