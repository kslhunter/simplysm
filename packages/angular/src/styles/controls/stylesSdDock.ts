import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdDock = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-dock"], o => o
    .style({
      "display": "block",
      "position": "absolute",
      "background": "white",
      "overflow": "auto",
      "z-index": "1"
    })
    .select(["&[sd-position=top]"], o => o
      .style({
        "border-bottom": `1px solid ${s.vars.transColor.default}`
      })
    )
    .select(["&[sd-position=bottom]"], o => o
      .style({
        "border-top": `1px solid ${s.vars.transColor.default}`
      })
    )
    .select(["&[sd-position=left]"], o => o
      .style({
        "border-right": `1px solid ${s.vars.transColor.default}`
      })
    )
    .select(["&[sd-position=right]"], o => o
      .style({
        "border-left": `1px solid ${s.vars.transColor.default}`
      })
    )
    .select(["> hr"], o => o
      .style({
        "display": "none",
        "user-select": "none"
      })
    )
    .select(["&[sd-resizable=true]"], o => o
      .select(["> hr"], o => o
        .style({
          "display": "block",
          "position": "absolute",
          "width": "4px",
          "height": "4px",
          "background": s.vars.transColor.default,
          "margin": "0",
          "padding": "0",
          "border": "none",
          "z-index": "1"
        })
      )
      .select(["&[sd-position=top]"], o => o
        .style({
          "padding-bottom": "4px"
        })
        .select(["> hr"], o => o
          .style({
            "bottom": "0",
            "left": "0",
            "width": "100%",
            "cursor": "ns-resize"
          })
        )
      )
      .select(["&[sd-position=bottom]"], o => o
        .style({
          "padding-top": "4px"
        })
        .select(["> hr"], o => o
          .style({
            "top": "0",
            "left": "0",
            "width": "100%",
            "cursor": "ns-resize"
          })
        )
      )
      .select(["&[sd-position=left]"], o => o
        .style({
          "padding-right": "4px"
        })
        .select(["> hr"], o => o
          .style({
            "top": "0",
            "right": "0",
            "height": "100%",
            "cursor": "ew-resize"
          })
        )
      )
      .select(["&[sd-position=right]"], o => o
        .style({
          "padding-left": "4px"
        })
        .select(["> hr"], o => o
          .style({
            "top": "0",
            "left": "0",
            "height": "100%",
            "cursor": "ew-resize"
          })
        )
      )
    )
  );
