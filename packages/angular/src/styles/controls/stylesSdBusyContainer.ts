import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdBusyContainer = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-busy-container"], o => o
    .style({
      "display": "block",
      "position": "relative",
      "top": "0",
      "left": "0",
      "width": "100%",
      "height": "100%",
      "min-width": "70px",
      "min-height": "70px"
    })
    .select(["> ._screen"], o => o
      .style({
        "position": "absolute",
        "top": "0",
        "left": "0",
        "width": "100%",
        "height": "100%",
        "background": "rgba(0, 0, 0, .2)",
        "z-index": `${s.vars.zIndex.busy}`,
        "visibility": "hidden",
        "pointer-events": "none",
        "opacity": "0",
        "transition": "opacity .3s linear"
      })
      .select(["> ._rect"], o => o
        .style({
          "transform": "translateY(-100%)",
          "transition": ".1s ease-in",
          "transition-property": "transform"
        })
        .select(["> ._indicator"], o => o
          .style({
            "top": "0",
            "width": "30px",
            "height": "30px",
            "margin": "20px auto 0 auto",
            "border": "6px solid white",
            "border-radius": "100%",
            "border-bottom-color": s.vars.themeColor.primary.default,
            "animation": "_sd-busy-spin 1s linear infinite"
          })
        )
      )
    )
    .select(["&[sd-busy=true]"], o => o
      .select(["> ._screen"], o => o
        .style({
          "visibility": "visible",
          "pointer-events": "auto",
          "opacity": "1"
        })
        .select(["> ._rect"], o => o
          .style({
            "transform": "none",
            "transition": ".1s ease-out"
          })
        )
      )
    )
  )
  .keyFrame("_sd-busy-spin", {
    "from": {
      "transform": "rotate(0deg)"
    },
    "to": {
      "transform": "rotate(360deg)"
    }
  });
