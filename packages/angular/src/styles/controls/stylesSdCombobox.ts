import {SdStyleBuilder} from "../../style/SdStyleBuilder";
import {SdStylePresets} from "../../style/SdStylePresets";

//tslint:disable:no-shadowed-variable
export const stylesSdCombobox = (s: SdStylePresets) => new SdStyleBuilder()
  .select(["sd-combobox"], o => o
    .style({
      "display": "block",
      "overflow": "visible",
      "position": "relative"
    })
    .select(["> ._icon"], o => o
      .style({
        "position": "absolute",
        "top": "1px",
        "right": "1px",
        "padding": `${s.vars.gap.sm} 0`,
        "width": "30px",
        "text-align": "center",
        "pointer-events": "none"
      })
    )
    .select(["> sd-textfield > input"], o => o
      .style({
        "padding-right": "30px !important"
      })
    )
  )
  .select(["._sd-combobox-dropdown"], o => o
    .style({
      "position": "fixed",
      "z-index": `${s.vars.zIndex.dropdown}`,
      "opacity": "0",
      "transform": "translateY(-10px)",
      "transition": ".1s linear",
      "transition-property": "transform, opacity",
      "pointer-events": "none",
      "background": "white",
      ...s.mixins.elevation(6),
      "min-width": "120px"
    })
    .select(["&:focus"], o => o
      .style({
        "outline": `1px solid ${s.vars.themeColor.primary.default}`
      })
    )
  );
